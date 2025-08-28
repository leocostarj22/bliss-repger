<?php

namespace App\Contracts;

interface UserInterface
{
    public function isAdmin(): bool;
    public function isManager(): bool;
    public function isAgent(): bool;
    public function getId();
    public function getEmployee();
}