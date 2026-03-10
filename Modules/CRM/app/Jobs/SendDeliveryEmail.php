<?php

namespace Modules\CRM\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Modules\CRM\Models\Delivery;
use Modules\CRM\Models\Campaign;
use Modules\CRM\Models\Contact;

class SendDeliveryEmail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $deliveryId) {}

    public function handle(): void
    {
        $delivery = Delivery::find($this->deliveryId);
        if (! $delivery) {
            Log::warning('crm.mail.abort', ['delivery_id' => $this->deliveryId, 'reason' => 'delivery_not_found']);
            return;
        }
        Log::info('crm.mail.start', ['delivery_id' => $delivery->id]);

        $campaign = Campaign::find($delivery->campaign_id);
        $contact = Contact::find($delivery->contact_id);

        if (! $campaign || ! $contact) {
            Log::warning('crm.mail.abort', ['delivery_id' => $delivery->id, 'reason' => 'missing_campaign_or_contact']);
            return;
        }
        if ($campaign->channel !== 'email') {
            Log::info('crm.mail.abort', ['delivery_id' => $delivery->id, 'reason' => 'channel_not_email', 'channel' => $campaign->channel]);
            return;
        }

        $template = $campaign->template;
        $subject = $campaign->subject ?: ($template?->subject ?? $campaign->name);
        $content = $campaign->content ?: ($template?->content ?? '<p>Olá {{ name }},</p><p>Mensagem da campanha: {{ campaign }}</p>');

        try {
            $content = $this->renderContent($content, $contact, $campaign);
            $content = $this->injectTracking($content, $delivery, $campaign);
            $content = $this->ensureAbsoluteUrls($content);
            $content = $this->normalizeHighlightMarks($content);
            $content = $this->inlineBasicImageStyles($content);
            $content = $this->normalizeEmailHtml($content);

            Log::info('crm.mail.composed', [
                'delivery_id' => $delivery->id,
                'campaign_id' => $campaign->id,
                'template_id' => $template?->id,
                'has_pixel' => stripos($content, 'crm/track/pixel') !== false,
                'has_click' => stripos($content, 'crm/track/click') !== false,
                'href_count' => preg_match_all('/<a\b[^>]*href\s*=\s*([\'\"])(.*?)\1/i', $content),
                'social_links' => preg_match_all('/<a[^>]*href[^>]*facebook|instagram|twitter|linkedin|youtube|tiktok[^>]*>/i', $content),
                'button_links' => preg_match_all('/<a[^>]*style[^>]*background-color[^>]*>/i', $content),
            ]);

            Mail::html($content, function ($message) use ($contact, $campaign, $subject) {
                if ($campaign->from_email) {
                    $message->from($campaign->from_email, $campaign->from_name ?: null);
                }
                $message->to($contact->email)->subject($subject);
            });
        } catch (\Throwable $e) {
            Log::error('crm.mail.failed', [
                'delivery_id' => $delivery->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        Log::info('crm.mail.sent', [
            'delivery_id' => $delivery->id,
            'campaign_id' => $campaign->id,
            'to' => $contact->email,
            'subject' => $subject,
        ]);

        $delivery->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        $pending = Delivery::where('campaign_id', $campaign->id)
            ->where(function ($q) {
                $q->whereNull('sent_at')->orWhere('status', '!=', 'sent');
            })
            ->count();

        if ($pending === 0) {
            $campaign->update(['status' => 'sent']);
            Log::info('crm.campaign.completed', ['campaign_id' => $campaign->id]);
        }
    }

    private function renderContent(string $content, Contact $contact, Campaign $campaign): string
    {
        return preg_replace_callback('/\{\{\s*(\w+)\s*\}\}/', function ($matches) use ($contact, $campaign) {
            $key = $matches[1];
            if ($key === 'campaign') {
                return $campaign->name;
            }
            $value = $contact->getAttribute($key);
            return is_scalar($value) ? (string) $value : '';
        }, $content);
    }

    private function injectTracking(string $html, Delivery $delivery, Campaign $campaign): string
    {
        $trackOpens = (bool) $campaign->track_opens;
        $trackClicks = (bool) $campaign->track_clicks;

        $appendToBody = function (string $source, string $snippet): string {
            if (stripos($source, '</body>') !== false) {
                return preg_replace('/<\/body>/i', $snippet . '</body>', $source, 1);
            }
            if (stripos($source, '</html>') !== false) {
                return preg_replace('/<\/html>/i', $snippet . '</html>', $source, 1);
            }
            return $source . $snippet;
        };

        if ($trackOpens) {
            try {
                $pixelUrl = route('crm.track.pixel', ['delivery' => $delivery->id]);
            } catch (\Throwable $e) {
                Log::warning('crm.route.missing', ['route' => 'crm.track.pixel', 'error' => $e->getMessage()]);
                $pixelUrl = url('crm/track/pixel/' . $delivery->id);
            }
            $pixelUrl = $pixelUrl . (strpos($pixelUrl, '?') !== false ? '&' : '?') . 'v=' . time();
            if (stripos($html, 'crm/track/pixel') === false) {
                $html = $appendToBody($html, '<img src="' . $pixelUrl . '" width="1" height="1" style="display:none" alt="" />');
            }
        }

        $clickBase = null;
        if ($trackClicks) {
            try {
                $clickBase = route('crm.track.click', ['delivery' => $delivery->id]);
            } catch (\Throwable $e) {
                Log::warning('crm.route.missing', ['route' => 'crm.track.click', 'error' => $e->getMessage()]);
                $clickBase = url('crm/track/click/' . $delivery->id);
            }
        }

        $rewrite = function (string $target) use ($clickBase) {
            if ($clickBase === null) {
                return $target;
            }
            if ($target === ''
                || stripos($target, 'mailto:') === 0
                || stripos($target, 'tel:') === 0
                || stripos($target, 'javascript:') === 0
                || stripos($target, 'data:') === 0
                || stripos($target, 'crm/track/unsubscribe') !== false) {
                return $target;
            }
            // Permitir rastreamento de links que não sejam apenas âncoras internas
            if ($target[0] === '#' && !preg_match('/^#[a-zA-Z]/', $target)) {
                return $target;
            }
            if (stripos($target, 'crm/track/click') !== false) {
                $parsed = parse_url($target);
                $q = $parsed['query'] ?? '';
                parse_str($q, $params);
                $original = $params['url'] ?? $target;
                return $clickBase . '?url=' . urlencode($original);
            }
            return $clickBase . '?url=' . urlencode($target);
        };

        if ($trackClicks && $clickBase !== null) {
            // Quoted href ("..." or '...')
            $html = preg_replace_callback('/href\s*=\s*([\'\"])(.*?)\1/i', function ($m) use ($rewrite) {
                $quote = $m[1];
                $target = $m[2];
                $new = $rewrite($target);
                return 'href=' . $quote . $new . $quote;
            }, $html);

            // Unquoted href (href=/path or href=https://...)
            $html = preg_replace_callback('/href\s*=\s*([^\s\"\'>]+)/i', function ($m) use ($rewrite) {
                $target = $m[1];
                $new = $rewrite($target);
                return 'href="' . $new . '"';
            }, $html);
        }

        // Append unsubscribe link if missing
        try {
            $unsubscribeUrl = route('crm.track.unsubscribe', ['delivery' => $delivery->id]);
        } catch (\Throwable $e) {
            Log::warning('crm.route.missing', ['route' => 'crm.track.unsubscribe', 'error' => $e->getMessage()]);
            $unsubscribeUrl = url('crm/track/unsubscribe/' . $delivery->id);
        }
        if (stripos($html, 'crm/track/unsubscribe') === false) {
            $html = $appendToBody(
                $html,
                '<p style="margin-top:16px;font-size:12px;color:#666">' .
                'Para deixar de receber estes emails, <a href="' . $unsubscribeUrl . '">clique aqui</a>.' .
                '</p>'
            );
        }

        return $html;
    }

    private function ensureAbsoluteUrls(string $html): string
    {
        $base = rtrim(config('app.url') ?: url('/'), '/');

        $html = preg_replace_callback('/\b(href|src)\s*=\s*([\'\"])(.*?)\2/i', function ($m) use ($base) {
            $attr = $m[1];
            $q = $m[2];
            $val = $m[3];
            if ($val === '' || preg_match('/^(https?:|mailto:|tel:|data:|cid:|javascript:|#|\/\/)/i', $val)) {
                return $m[0];
            }
            $new = $val[0] === '/' ? ($base . $val) : ($base . '/' . $val);
            return $attr . '=' . $q . $new . $q;
        }, $html);

        $html = preg_replace_callback('/\b(href|src)\s*=\s*([^\s"\'>]+)/i', function ($m) use ($base) {
            $attr = $m[1];
            $val = $m[2];
            if ($val === '' || preg_match('/^(https?:|mailto:|tel:|data:|cid:|javascript:|#|\/\/)/i', $val)) {
                return $m[0];
            }
            $new = $val[0] === '/' ? ($base . $val) : ($base . '/' . $val);
            return $attr . '="' . $new . '"';
        }, $html);

        return $html;
    }

    private function inlineBasicImageStyles(string $html): string
    {
        $defaults = 'display:block;border:0;outline:none;text-decoration:none;max-width:100%;height:auto;-ms-interpolation-mode:bicubic;';

        return preg_replace_callback('/<img\b([^>]*)>/i', function ($m) use ($defaults) {
            $attrs = $m[1] ?? '';
            if (preg_match('/\bstyle\s*=\s*([\'\"])(.*?)\1/i', $attrs, $sm)) {
                $q = $sm[1];
                $style = $sm[2];
                $attrs = preg_replace('/\bstyle\s*=\s*([\'\"])(.*?)\1/i', 'style=' . $q . $style . ' ' . $defaults . $q, $attrs, 1);
            } else {
                $attrs .= ' style="' . $defaults . '"';
            }
            if (!preg_match('/\balt\s*=\s*/i', $attrs)) {
                $attrs .= ' alt=""';
            }
            return '<img' . $attrs . '>';
        }, $html);
    }

    private function normalizeHighlightMarks(string $html): string
    {
        $html = preg_replace('/<mark\b/i', '<span', $html);
        $html = preg_replace('/<\/mark>/i', '</span>', $html);
        return $html;
    }

    private function normalizeEmailHtml(string $html): string
    {
        if (stripos($html, 'data-crm-wrap="1"') !== false) {
            return $html;
        }

        $bodyStyle = 'margin:0;padding:0;background-color:#f5f7fb;';
        $tdInnerStyle = "font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size:16px; line-height:1.5; color:#222222; padding:0 24px;";

        $wrapInner = function (string $inner) use ($tdInnerStyle): string {
            return '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width:100%;background-color:#f5f7fb;">'.
                '<tr><td align="center">'.
                '<table data-crm-wrap="1" role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width:100%;max-width:600px;margin:0 auto;background:#ffffff;">'.
                '<tr><td align="left" style="' . $tdInnerStyle . '">' . $inner . '</td></tr>'.
                '</table>'.
                '</td></tr></table>';
        };

        if (stripos($html, '<html') !== false) {
            if (stripos($html, 'name="viewport"') === false) {
                if (preg_match('/<head\b[^>]*>/i', $html)) {
                    $html = preg_replace('/<head\b[^>]*>/i', '$0<meta name="viewport" content="width=device-width, initial-scale=1.0"/>', $html, 1);
                } else {
                    $html = preg_replace('/<html\b[^>]*>/i', '$0<head><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>', $html, 1);
                }
            }

            if (preg_match('/<body\b[^>]*>([\s\S]*?)<\/body>/i', $html, $bm)) {
                $inner = $bm[1];
                $html = preg_replace(
                    '/<body\b[^>]*>[\s\S]*?<\/body>/i',
                    '<body style="' . $bodyStyle . '">' . $wrapInner($inner) . '</body>',
                    $html,
                    1
                );
                return $html;
            }

            return '<!doctype html><html><head>'.
                '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />'.
                '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>'.
                '</head><body style="' . $bodyStyle . '">' .
                $wrapInner($html) .
                '</body></html>';
        }

        return '<!doctype html><html><head>'.
            '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />'.
            '<meta name="viewport" content="width=device-width, initial-scale=1.0"/>'.
            '</head><body style="' . $bodyStyle . '">' .
            $wrapInner($html) .
            '</body></html>';
    }
}