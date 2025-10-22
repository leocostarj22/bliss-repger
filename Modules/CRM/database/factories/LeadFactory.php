<?php

namespace Modules\CRM\Database\Factories;

use Modules\CRM\Models\Lead;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\User;

class LeadFactory extends Factory
{
    protected $model = Lead::class;

    public function definition(): array
    {
        return [
            'name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'phone' => $this->faker->phoneNumber(),
            'company' => $this->faker->company(),
            'status' => $this->faker->randomElement(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
            'source' => $this->faker->randomElement(['website', 'referral', 'social_media', 'email_marketing', 'cold_call', 'event', 'other']),
            'notes' => $this->faker->optional()->paragraph(),
            'assigned_to' => User::inRandomOrder()->first()?->id,
            'value' => $this->faker->optional()->randomFloat(2, 1000, 100000),
            'expected_close_date' => $this->faker->optional()->dateTimeBetween('now', '+6 months'),
        ];
    }

    public function asNew(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'new',
        ]);
    }

    public function won(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'won',
        ]);
    }

    public function lost(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'lost',
        ]);
    }
}