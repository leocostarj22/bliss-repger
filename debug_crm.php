<?php
$resolver = new \Modules\CRM\Services\SegmentResolver();
$campaigns = \Modules\CRM\Models\Campaign::whereIn('status', ['scheduled', 'sending'])->get();
$results = [];
foreach ($campaigns as $c) {
    try {
        $contacts = $c->segment_id ? $resolver->resolveContacts($c->segment_id) : collect();
        $results[] = [
            'id' => $c->id,
            'name' => $c->name,
            'status' => $c->status,
            'scheduled_at' => $c->scheduled_at ? $c->scheduled_at->toDateTimeString() : 'null',
            'now' => now()->toDateTimeString(),
            'is_due' => $c->scheduled_at <= now(),
            'segment_id' => $c->segment_id,
            'segment_exists' => (bool)$c->segment,
            'contacts_count' => $contacts->count(),
            'deliveries_count' => $c->deliveries()->count(),
            'sent_deliveries' => $c->deliveries()->whereNotNull('sent_at')->count(),
            'pending_deliveries' => $c->deliveries()->whereNull('sent_at')->count(),
        ];
    } catch (\Throwable $e) {
        $results[] = [
            'id' => $c->id,
            'error' => $e->getMessage()
        ];
    }
}
echo json_encode($results, JSON_PRETTY_PRINT);