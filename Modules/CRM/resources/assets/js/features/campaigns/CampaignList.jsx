import React from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon } from '@heroicons/react/20/solid';

const campaigns = [
    { id: 1, name: 'Welcome Series', status: 'Active', sent: 1200, openRate: '45%', clickRate: '12%', lastSent: '2h ago' },
    { id: 2, name: 'Product Launch', status: 'Draft', sent: 0, openRate: '-', clickRate: '-', lastSent: '-' },
    { id: 3, name: 'Weekly Newsletter', status: 'Sent', sent: 5400, openRate: '32%', clickRate: '8%', lastSent: 'Yesterday' },
];

export default function CampaignList() {
    return (
        <div className="px-4 sm:px-6 lg:px-8">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-base font-semibold leading-6 text-gray-900">Campanhas</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Lista de todas as campanhas de email marketing, incluindo status e métricas de performance.
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                    <Link
                        to="/campaigns/new"
                        className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        Nova Campanha
                    </Link>
                </div>
            </div>
            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead>
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Nome</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Enviados</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Open Rate</th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                                        <span className="sr-only">Editar</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {campaigns.map((campaign) => (
                                    <tr key={campaign.id}>
                                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{campaign.name}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                                                campaign.status === 'Active' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                campaign.status === 'Draft' ? 'bg-gray-50 text-gray-600 ring-gray-500/10' :
                                                'bg-blue-50 text-blue-700 ring-blue-700/10'
                                            }`}>
                                                {campaign.status}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{campaign.sent}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{campaign.openRate}</td>
                                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                                            <Link to={`/campaigns/${campaign.id}`} className="text-indigo-600 hover:text-indigo-900">
                                                Editar<span className="sr-only">, {campaign.name}</span>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}