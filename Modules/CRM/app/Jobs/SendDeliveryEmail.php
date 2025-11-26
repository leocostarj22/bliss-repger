<?php

namespace Modules\CRM\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
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
            return;
        }

        $campaign = Campaign::find($delivery->campaign_id);
        $contact = Contact::find($delivery->contact_id);

        if (! $campaign || ! $contact || $campaign->channel !== 'email') {
            return;
        }

        $template = $campaign->template; // may be null
        $subject = $template?->subject ?? $campaign->name;
        $content = $template?->content ?? '<p>Olá {{ name }},</p><p>Mensagem da campanha: {{ campaign }}</p>';

        $content = $this->renderContent($content, $contact, $campaign);
        $content = $this->injectTracking($content, $delivery);

        Mail::html($content, function ($message) use ($contact, $subject) {
            $message->to($contact->email)->subject($subject);
        });

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
        $html = $html . '<img src="' . $pixelUrl . '" width="1" height="1" style="display:none" alt="" />';

        $clickBase = route('crm.track.click', ['delivery' => $delivery->id]);
        $html = preg_replace_callback('/href="([^"]+)"/i', function ($m) use ($clickBase) {
            $target = $m[1];
            $tracked = $clickBase . '?url=' . urlencode($target);
            return 'href="' . $tracked . '"';
        }, $html);

        return $html;
    }
}