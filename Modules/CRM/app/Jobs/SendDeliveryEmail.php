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

        $template = $campaign->template; // may be null
        $subject = $template?->subject ?? $campaign->name;
        $content = $template?->content ?? '<p>Olá {{ name }},</p><p>Mensagem da campanha: {{ campaign }}</p>';

        try {
            $content = $this->renderContent($content, $contact, $campaign);
            $content = $this->injectTracking($content, $delivery);

            Log::info('crm.mail.composed', [
                'delivery_id' => $delivery->id,
                'campaign_id' => $campaign->id,
                'template_id' => $template?->id,
                'has_pixel' => stripos($content, 'crm/track/pixel') !== false,
                'has_click' => stripos($content, 'crm/track/click') !== false,
                'href_count' => preg_match_all('/<a\b[^>]*href\s*=\s*([\'\"])(.*?)\1/i', $content),
            ]);

            Mail::html($content, function ($message) use ($contact, $subject) {
                $message->to($contact->email)->subject($subject);
            });
        } catch (\Throwable $e) {
            Log::error('crm.mail.failed', [
                'delivery_id' => $delivery->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }

        $delivery->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);
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

    private function injectTracking(string $html, Delivery $delivery): string
    {
        $pixelUrl = route('crm.track.pixel', ['delivery' => $delivery->id]);
        if (stripos($html, 'crm/track/pixel') === false) {
            $html .= '<img src="' . $pixelUrl . '" width="1" height="1" style="display:none" alt="" />';
        }

        $clickBase = route('crm.track.click', ['delivery' => $delivery->id]);

        $rewrite = function (string $target) use ($clickBase) {
            if ($target === ''
                || $target[0] === '#'
                || stripos($target, 'mailto:') === 0
                || stripos($target, 'tel:') === 0
                || stripos($target, 'javascript:') === 0
                || stripos($target, 'data:') === 0) {
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

        return $html;
    }
}