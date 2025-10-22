<?php

namespace Modules\CRM\Filament\Resources\LeadResource\Pages;

use Modules\CRM\Filament\Resources\LeadResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use Filament\Forms;
use Modules\CRM\Models\Lead;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Filament\Notifications\Notification;
use OpenSpout\Reader\CSV\Reader as CsvReader;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;
use Carbon\Carbon;
use OpenSpout\Reader\CSV\Options as CsvOptions;

class ListLeads extends ListRecords
{
    protected static string $resource = LeadResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),

            // Importar via Excel/CSV com deduplicação e correção de encoding
            Actions\Action::make('import_excel')
                ->label('Importar Excel/CSV')
                ->color('primary')
                ->icon('heroicon-o-arrow-up-tray')
                ->form([
                    Forms\Components\FileUpload::make('file')
                        ->label('Arquivo (CSV, XLSX ou XLS)')
                        ->disk('local')
                        ->directory('imports')
                        ->acceptedFileTypes([
                            'text/csv',
                            'application/vnd.ms-excel', // CSV e XLS podem vir com este mime
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        ])
                        ->required(),
                    Forms\Components\Toggle::make('deduplicate')
                        ->label('Evitar duplicados (email/telefone)')
                        ->default(true),
                ])
                ->action(function (array $data) {
                    $path = $data['file'];
                    $fullPath = Storage::disk('local')->path($path);
                    $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));
                    $deduplicate = (bool) ($data['deduplicate'] ?? true);

                    if (! in_array($ext, ['csv', 'xlsx', 'xls'])) {
                        Notification::make()
                            ->title('Formato não suportado')
                            ->body('Use .csv, .xlsx ou .xls.')
                            ->danger()
                            ->send();
                        return;
                    }

                    // Normalizador de cabeçalhos
                    $normalizeHeader = function (string $h): string {
                        $norm = Str::of($h)->lower()->trim()->toString();
                        $norm = str_replace(['  ', "\t"], ' ', $norm);
                        $norm = Str::of($norm)->replaceMatches('/[\\s_-]+/', ' ')->toString();
                        $norm = Str::of($norm)->replace(' ', '_')->toString();

                        $map = [
                            'nome' => 'name',
                            'name' => 'name',
                            'email' => 'email',
                            'e-mail' => 'email',
                            'phone' => 'phone',
                            'phone1' => 'phone',
                            'phone2' => 'phone',
                            'phone3' => 'phone',
                            'phone4' => 'phone',
                            'phone5' => 'phone',
                            'company' => 'company',
                            'empresa' => 'company',
                            'status' => 'status',
                            'fonte' => 'source',
                            'source' => 'source',
                            'assigned_to' => 'assigned_to',
                            'atribuido_para' => 'assigned_to',
                            'valor' => 'value',
                            'value' => 'value',
                            'data_prevista' => 'expected_close_date',
                            'data_prevista_de_fechamento' => 'expected_close_date',
                            'expected_close_date' => 'expected_close_date',
                            'observacoes' => 'notes',
                            'observacao' => 'notes',
                            'notas' => 'notes',
                            'notes' => 'notes',
                        ];

                        return $map[$norm] ?? $norm;
                    };

                    // Normalizador de texto: corrige mojibake e força UTF-8
                    $normalizeText = function ($val) {
                        if (!is_string($val)) {
                            return $val;
                        }
                        $val = trim($val);
                        if ($val === '') {
                            return $val;
                        }

                        $hasMojibake = function (string $s): bool {
                            return str_contains($s, 'Ã') || str_contains($s, 'Â') || str_contains($s, '�');
                        };

                        // Base case: se não for UTF-8 válido, tenta decodificar para UTF-8
                        if (function_exists('mb_check_encoding') && !mb_check_encoding($val, 'UTF-8')) {
                            $candidates = [
                                @iconv('Windows-1252', 'UTF-8//IGNORE', $val),
                                @iconv('ISO-8859-1', 'UTF-8//IGNORE', $val),
                                @utf8_encode($val),
                            ];
                            foreach ($candidates as $c) {
                                if (is_string($c) && ! $hasMojibake($c)) {
                                    return $c;
                                }
                            }
                            // fallback
                            return $candidates[0] ?? $val;
                        }

                        // UTF-8 válido mas com mojibake: tentar reparar
                        if ($hasMojibake($val)) {
                            $candidates = [];

                            // Caminho 1: desfazer dupla conversão (UTF-8 -> ISO-8859-1 -> UTF-8)
                            $decoded = @utf8_decode($val); // UTF-8 -> ISO-8859-1
                            $reencoded = @iconv('ISO-8859-1', 'UTF-8//IGNORE', $decoded);
                            if (is_string($reencoded)) {
                                $candidates[] = $reencoded;
                            }

                            // Caminho 2: tratar como Windows-1252
                            $candidates[] = @iconv('Windows-1252', 'UTF-8//IGNORE', $val);

                            // Caminho 3: fallback simples
                            $candidates[] = @utf8_encode($val);

                            // Escolher candidato com menos sinais de mojibake
                            $best = $val;
                            $bestScore = PHP_INT_MAX;
                            foreach ($candidates as $c) {
                                if (!is_string($c)) {
                                    continue;
                                }
                                $score = substr_count($c, 'Ã') + substr_count($c, 'Â') + substr_count($c, '�');
                                if ($score < $bestScore) {
                                    $bestScore = $score;
                                    $best = $c;
                                }
                            }
                            return $best;
                        }

                        return $val;
                    };

                    // Normalização de email/telefone para deduplicação
                    $normalizeEmail = fn($email) => $email ? strtolower(trim($email)) : null;
                    $normalizePhone = function ($phone) {
                        if (!$phone) return null;
                        $p = preg_replace('/[\\s\\-\\.\\(\\)\\+]/', '', (string) $phone);
                        return $p ?: null;
                    };

                    $findExistingLead = function (?string $email, ?string $phoneNorm) {
                        if ($email && $phoneNorm) {
                            return Lead::query()
                                ->where(function ($q) use ($email, $phoneNorm) {
                                    $q->whereRaw('LOWER(email) = ?', [$email])
                                      ->orWhereRaw('REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone," ",""),"(",""),")",""),"-",""),".","") = ?', [$phoneNorm]);
                                })
                                ->first();
                        }
                        if ($email) {
                            return Lead::query()
                                ->whereRaw('LOWER(email) = ?', [$email])
                                ->first();
                        }
                        if ($phoneNorm) {
                            return Lead::query()
                                ->whereRaw('REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone," ",""),"(",""),")",""),"-",""),".","") = ?', [$phoneNorm])
                                ->first();
                        }
                        return null;
                    };

                    $headers = [];
                    $imported = 0;
                    $skipped = 0;

                    $processRow = function (array $rowAssoc) use (&$imported, &$skipped, $deduplicate, $normalizeEmail, $normalizePhone, $findExistingLead) {
                        $statuses = array_keys(Lead::getStatuses());
                        $sources = array_keys(Lead::getSources());

                        $dataToCreate = [
                            'name' => $rowAssoc['name'] ?? null,
                            'email' => $rowAssoc['email'] ?? null,
                            'phone' => $rowAssoc['phone'] ?? null,
                            'company' => $rowAssoc['company'] ?? null,
                            'status' => in_array(($rowAssoc['status'] ?? 'new'), $statuses, true)
                                ? ($rowAssoc['status'] ?? 'new')
                                : 'new',
                            'source' => in_array(($rowAssoc['source'] ?? 'other'), $sources, true)
                                ? ($rowAssoc['source'] ?? 'other')
                                : 'other',
                            'assigned_to' => !empty($rowAssoc['assigned_to']) ? (int) $rowAssoc['assigned_to'] : null,
                            'value' => isset($rowAssoc['value']) && $rowAssoc['value'] !== ''
                                ? (float) str_replace(',', '.', (string) $rowAssoc['value'])
                                : null,
                            'expected_close_date' => null,
                            'notes' => $rowAssoc['notes'] ?? null,
                        ];

                        // Datas
                        $dateCandidates = [
                            $rowAssoc['expected_close_date'] ?? null,
                            $rowAssoc['data_prevista'] ?? null,
                            $rowAssoc['data_prevista_de_fechamento'] ?? null,
                        ];
                        foreach ($dateCandidates as $dc) {
                            if (!empty($dc)) {
                                try {
                                    if (is_numeric($dc)) {
                                        // Excel serial date -> timestamp
                                        $dt = Carbon::createFromTimestamp((($dc - 25569) * 86400))->startOfDay();
                                    } else {
                                        $dt = Carbon::parse((string) $dc)->startOfDay();
                                    }
                                    if ($dt !== false) {
                                        $dataToCreate['expected_close_date'] = $dt;
                                        break;
                                    }
                                } catch (\Throwable $e) {}
                            }
                        }

                        try {
                            if ($deduplicate) {
                                $emailNorm = $normalizeEmail($dataToCreate['email']);
                                $phoneNorm = $normalizePhone($dataToCreate['phone']);

                                $existing = $findExistingLead($emailNorm, $phoneNorm);
                                if ($existing) {
                                    $skipped++;
                                    return;
                                }
                            }

                            Lead::create($dataToCreate);
                            $imported++;
                        } catch (\Throwable $e) {
                            $skipped++;
                        }
                    };

                    if ($ext === 'csv') {
                        // Detectar delimitador
                        $fh = fopen($fullPath, 'r');
                        $firstLine = $fh ? fgets($fh) : '';
                        if ($fh) {
                            fclose($fh);
                        }
                        $semicolonCount = substr_count((string) $firstLine, ';');
                        $commaCount = substr_count((string) $firstLine, ',');

                        $csvOptions = new CsvOptions();
                        $firstLineNorm = Str::of((string) $firstLine)->lower()->toString();
                        $preferComma = Str::contains($firstLineNorm, 'name,email,phone');
                        $delimiter = $preferComma ? ',' : ($semicolonCount > $commaCount ? ';' : ',');

                        // OpenSpout v4 usa propriedades, não setters
                        $csvOptions->FIELD_DELIMITER = $delimiter;
                        $csvOptions->FIELD_ENCLOSURE = '"';
                        $csvOptions->ENCODING = 'UTF-8';

                        $reader = new CsvReader($csvOptions);
                        $reader->open($fullPath);

                        foreach ($reader->getSheetIterator() as $sheet) {
                            $isHeaderProcessed = false;

                            foreach ($sheet->getRowIterator() as $row) {
                                $values = array_map(fn($cell) => $cell->getValue(), $row->getCells());
                                // Corrige encoding de cada célula
                                $values = array_map(function ($v) use ($normalizeText) {
                                    return is_string($v) ? $normalizeText($v) : $v;
                                }, $values);

                                if (! $isHeaderProcessed) {
                                    $headers = array_map(fn($h) => $normalizeHeader((string) $h), $values);
                                    $isHeaderProcessed = true;
                                    continue;
                                }

                                if (empty($headers)) {
                                    $skipped++;
                                    continue;
                                }

                                $rowAssoc = [];
                                foreach ($values as $i => $val) {
                                    $key = $headers[$i] ?? 'col_'.$i;
                                    if (!array_key_exists($key, $rowAssoc)) {
                                        $rowAssoc[$key] = is_string($val) ? trim((string) $val) : $val;
                                    }
                                }

                                $processRow($rowAssoc);
                            }

                            break; // primeira sheet apenas
                        }

                        $reader->close();
                    } elseif ($ext === 'xlsx') {
                        $reader = new XlsxReader();
                        $reader->open($fullPath);

                        foreach ($reader->getSheetIterator() as $sheet) {
                            $isHeaderProcessed = false;

                            foreach ($sheet->getRowIterator() as $row) {
                                $values = array_map(fn($cell) => $cell->getValue(), $row->getCells());
                                $values = array_map(function ($v) use ($normalizeText) {
                                    return is_string($v) ? $normalizeText($v) : $v;
                                }, $values);

                                if (! $isHeaderProcessed) {
                                    $headers = array_map(fn($h) => $normalizeHeader((string) $h), $values);
                                    $isHeaderProcessed = true;
                                    continue;
                                }

                                if (empty($headers)) {
                                    $skipped++;
                                    continue;
                                }

                                $rowAssoc = [];
                                foreach ($values as $i => $val) {
                                    $key = $headers[$i] ?? 'col_'.$i;
                                    if (!array_key_exists($key, $rowAssoc)) {
                                        $rowAssoc[$key] = is_string($val) ? trim((string) $val) : $val;
                                    }
                                }

                                $processRow($rowAssoc);
                            }

                            break;
                        }

                        $reader->close();
                    } else { // XLS via PhpSpreadsheet
                        if (! class_exists(\PhpOffice\PhpSpreadsheet\IOFactory::class)) {
                            Notification::make()
                                ->title('Biblioteca ausente')
                                ->body('Instale phpoffice/phpspreadsheet para importar ficheiros .xls.')
                                ->danger()
                                ->send();
                            return;
                        }

                        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($fullPath);
                        $worksheet = $spreadsheet->getActiveSheet();
                        $isHeaderProcessed = false;

                        foreach ($worksheet->getRowIterator() as $row) {
                            $cellIterator = $row->getCellIterator();
                            $cellIterator->setIterateOnlyExistingCells(false);

                            $values = [];
                            foreach ($cellIterator as $cell) {
                                $raw = $cell->getValue();
                                $values[] = is_string($raw)
                                    ? $normalizeText(trim((string) $raw))
                                    : $raw;
                            }

                            if (! $isHeaderProcessed) {
                                $headers = array_map(fn($h) => $normalizeHeader((string) $h), $values);
                                $isHeaderProcessed = true;
                                continue;
                            }

                            if (empty($headers)) {
                                $skipped++;
                                continue;
                            }

                            $rowAssoc = [];
                            foreach ($values as $i => $val) {
                                $key = $headers[$i] ?? 'col_'.$i;
                                if (!array_key_exists($key, $rowAssoc)) {
                                    $rowAssoc[$key] = is_string($val) ? trim((string) $val) : $val;
                                }
                            }

                            $processRow($rowAssoc);
                        }
                    }

                    Notification::make()
                        ->title('Importação concluída')
                        ->body("Importados: {$imported}, Ignorados (duplicados): {$skipped}.")
                        ->success()
                        ->send();
                }),

            // Importar via SQL (somente INSERT INTO leads ...)
            Actions\Action::make('import_sql')
                ->label('Importar por SQL')
                ->color('primary')
                ->icon('heroicon-o-code-bracket')
                ->form([
                    Forms\Components\Textarea::make('sql')
                        ->label('Comandos SQL (somente INSERT em leads)')
                        ->rows(8)
                        ->required(),
                ])
                ->requiresConfirmation()
                ->action(function (array $data) {
                    $sql = trim($data['sql']);
                    $lower = Str::lower($sql);

                    // Restringe a comandos INSERT na tabela leads
                    if (!Str::contains($lower, 'insert into') || !Str::contains($lower, 'leads')) {
                        Notification::make()
                            ->title('SQL inválido')
                            ->body('Somente comandos INSERT INTO leads são permitidos.')
                            ->danger()
                            ->send();
                        return;
                    }

                    DB::transaction(function () use ($sql) {
                        DB::unprepared($sql);
                    });

                    Notification::make()
                        ->title('Importação por SQL')
                        ->body('Comandos executados com sucesso.')
                        ->success()
                        ->send();
                }),

            // Exportar CSV respeitando filtros ativos, com BOM e charset UTF-8
            Actions\Action::make('export_csv')
                ->label('Exportar CSV')
                ->color('primary')
                ->icon('heroicon-o-arrow-down-tray')
                ->action(function () {
                    $query = $this->getFilteredTableQuery();
                    $filename = 'leads-' . now()->format('Ymd-His') . '.csv';

                    return response()->streamDownload(function () use ($query) {
                        $out = fopen('php://output', 'w');

                        // Escreve BOM para Excel reconhecer UTF-8
                        echo "\xEF\xBB\xBF";

                        // Cabeçalhos
                        fputcsv($out, [
                            'id',
                            'name',
                            'email',
                            'phone',
                            'company',
                            'status',
                            'source',
                            'assigned_to',
                            'value',
                            'expected_close_date',
                            'created_at',
                        ]);

                        // Dados
                        $query->orderBy('id')->chunk(1000, function ($leads) use ($out) {
                            foreach ($leads as $lead) {
                                fputcsv($out, [
                                    $lead->id,
                                    $lead->name,
                                    $lead->email,
                                    $lead->phone,
                                    $lead->company,
                                    $lead->status,
                                    $lead->source,
                                    $lead->assigned_to,
                                    $lead->value,
                                    optional($lead->expected_close_date)->format('Y-m-d'),
                                    $lead->created_at->format('Y-m-d H:i:s'),
                                ]);
                            }
                        });

                        fclose($out);
                    }, $filename, [
                        'Content-Type' => 'text/csv; charset=UTF-8',
                    ]);
                }),

            // Modelo CSV com BOM para Excel (delimitador ';')
            Actions\Action::make('download_csv_template')
                ->label('Baixar modelo CSV')
                ->color('primary')
                ->icon('heroicon-o-document-arrow-down')
                ->action(function () {
                    $filename = 'leads-template.csv';

                    return response()->streamDownload(function () {
                        $out = fopen('php://output', 'w');

                        // BOM para Excel reconhecer UTF-8
                        echo "\xEF\xBB\xBF";

                        // Cabeçalhos com delimitador ';' (comum em PT/BR/pt-PT)
                        fputcsv($out, [
                            'name',
                            'email',
                            'phone',
                            'company',
                            'status',
                            'source',
                            'assigned_to',
                            'value',
                            'expected_close_date',
                            'notes',
                        ]);

                        fclose($out);
                    }, $filename, [
                        'Content-Type' => 'text/csv; charset=UTF-8',
                    ]);
                }),

            // Ferramenta para corrigir encoding de leads já cadastrados
            Actions\Action::make('fix_encoding')
                ->label('Corrigir acentuação')
                ->color('warning')
                ->icon('heroicon-o-language')
                ->requiresConfirmation()
                ->action(function () {
                    $repair = function ($val) {
                        if (!is_string($val) || $val === '') {
                            return $val;
                        }
                        $hasMojibake = fn($s) => str_contains($s, 'Ã') || str_contains($s, 'Â') || str_contains($s, '�');

                        if (function_exists('mb_check_encoding') && mb_check_encoding($val, 'UTF-8')) {
                            if ($hasMojibake($val)) {
                                $decoded = @utf8_decode($val);
                                $reencoded = @iconv('ISO-8859-1', 'UTF-8//IGNORE', $decoded);
                                if (is_string($reencoded) && ! $hasMojibake($reencoded)) {
                                    return $reencoded;
                                }
                            }
                            return $val;
                        }

                        $candidates = [
                            @iconv('Windows-1252', 'UTF-8//IGNORE', $val),
                            @iconv('ISO-8859-1', 'UTF-8//IGNORE', $val),
                            @utf8_encode($val),
                        ];
                        foreach ($candidates as $c) {
                            if (is_string($c) && ! $hasMojibake($c)) {
                                return $c;
                            }
                        }

                        return $candidates[0] ?? $val;
                    };

                    $checked = 0;
                    $updated = 0;

                    Lead::query()
                        ->orderBy('id')
                        ->chunkById(500, function ($leads) use (&$checked, &$updated, $repair) {
                            foreach ($leads as $lead) {
                                $checked++;

                                $original = [
                                    'name' => $lead->name,
                                    'email' => $lead->email,
                                    'phone' => $lead->phone,
                                    'company' => $lead->company,
                                    'notes' => $lead->notes,
                                ];

                                $fixed = [];
                                foreach ($original as $k => $v) {
                                    $fixed[$k] = $repair($v);
                                }

                                if ($fixed !== $original) {
                                    $lead->fill($fixed);
                                    try {
                                        $lead->save();
                                        $updated++;
                                    } catch (\Throwable $e) {
                                        // ignora erro pontual
                                    }
                                }
                            }
                        });

                    Notification::make()
                        ->title('Encoding corrigido')
                        ->body("Verificados {$checked} leads, atualizados {$updated}.")
                        ->success()
                        ->send();
                }),
        ];
    }
}