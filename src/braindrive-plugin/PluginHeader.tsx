import React from 'react';
import { ArrowLeft, Settings } from 'lucide-react';

import { type PluginHeaderProps, ViewType } from './pluginTypes';
import { ServiceStatusIndicator } from '../components';


export const PluginHeader: React.FC<PluginHeaderProps> = ({
    pluginService,
    currentView,
    serviceStatuses,
    showServiceDetails,
    areServicesReady,
    collectionName,
}) => {
    // ===================================
    // HANDLER DISPATCHERS
    // ===================================

    const handleViewChange = (view: ViewType) => pluginService.handleViewChange(view);
    const handleBack = () => pluginService.handleBack();
    
    // Direct call for service checks
    const checkAllServices = () => pluginService.checkAllServices();
    return (
        <div className="dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        {/* Uses delegated handlers */}
                        {currentView !== ViewType.COLLECTIONS && (
                            <button
                                onClick={handleBack}
                                className="flex items-center hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                                disabled={!areServicesReady}
                            >
                                <ArrowLeft className="h-5 w-5 mr-2" />
                                Back
                            </button>
                        )}
                        <h1 className="text-base font-medium dark:text-gray-300 mb-0">
                            {currentView === ViewType.COLLECTIONS && 'Collections'}
                            {currentView === ViewType.DOCUMENTS && `Documents - ${collectionName}`}
                            {currentView === ViewType.CHAT && `Chat with ${collectionName} collection`}
                            {currentView === ViewType.SETTINGS && 'Plugin Settings'}
                        </h1>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        {/* Service Status Indicator - Uses delegated handlers */}
                        <ServiceStatusIndicator
                            serviceStatuses={serviceStatuses}
                            showDetails={showServiceDetails}
                            onToggleDetails={pluginService.toggleServiceDetails} // Direct Service call
                            onRefresh={checkAllServices}
                        />
                        
                        {currentView !== ViewType.SETTINGS && (
                            <button
                                onClick={() => handleViewChange(ViewType.SETTINGS)}
                                className="p-2 rounded-full hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                title="Settings"
                                disabled={!areServicesReady}
                            >
                                <Settings className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
};
