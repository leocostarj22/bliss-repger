import React from 'react';

export default function CampaignEditor() {
    return (
        <div className="bg-white px-4 py-5 shadow sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
                <div className="md:col-span-1">
                    <h3 className="text-base font-semibold leading-6 text-gray-900">Campaign Editor</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Customize your email campaign layout using drag and drop blocks.
                    </p>
                </div>
                <div className="mt-5 md:col-span-2 md:mt-0">
                    <div className="h-96 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                        Drag & Drop Email Editor (Coming Soon)
                    </div>
                </div>
            </div>
        </div>
    );
}