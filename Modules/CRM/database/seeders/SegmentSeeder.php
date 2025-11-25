<?php

namespace Modules\CRM\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\CRM\Models\Segment;

class SegmentSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['name' => 'Prospects BF', 'definition' => ['filters' => [['field' => 'status', 'op' => 'in', 'value' => ['prospect']], ['field' => 'utm_campaign', 'op' => 'eq', 'value' => 'Black-Friday'], ['field' => 'email', 'op' => 'not_null']]]],
            ['name' => 'Prospects Launch', 'definition' => ['filters' => [['field' => 'status', 'op' => 'in', 'value' => ['prospect']], ['field' => 'utm_campaign', 'op' => 'eq', 'value' => 'Launch'], ['field' => 'email', 'op' => 'not_null']]]],
            ['name' => 'Website Prospects', 'definition' => ['filters' => [['field' => 'source', 'op' => 'eq', 'value' => 'website'], ['field' => 'email', 'op' => 'not_null']]]],
            ['name' => 'Referral Prospects', 'definition' => ['filters' => [['field' => 'source', 'op' => 'eq', 'value' => 'referral'], ['field' => 'email', 'op' => 'not_null']]]],
            ['name' => 'All Prospects', 'definition' => ['filters' => [['field' => 'status', 'op' => 'in', 'value' => ['prospect']]]]],
        ];

        foreach ($items as $data) {
            Segment::create($data);
        }
    }
}