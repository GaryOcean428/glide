/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import { createAPIHealthCheck, APIHealthStatus } from '../utils/apiValidation';
import { getErrorHealthStatus, createErrorSummary } from '../utils/errorTracking';

interface HealthDashboardProps {
	onRefresh?: () => void;
}

/**
 * Real-time API Health Dashboard component
 * Displays status of all API providers and error information
 */
export const HealthDashboard: React.FC<HealthDashboardProps> = ({ onRefresh }) => {
	const [healthStatus, setHealthStatus] = useState<APIHealthStatus | null>(null);
	const [errorStatus, setErrorStatus] = useState<any>(null);
	const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
	const [autoRefresh, setAutoRefresh] = useState(true);

	const refreshHealth = () => {
		try {
			const health = createAPIHealthCheck();
			const errors = getErrorHealthStatus();
			const errorSummary = createErrorSummary();
			
			setHealthStatus(health);
			setErrorStatus({ ...errors, summary: errorSummary });
			setLastUpdated(new Date());
			
			if (onRefresh) {
				onRefresh();
			}
		} catch (error) {
			console.error('Failed to refresh health status:', error);
		}
	};

	useEffect(() => {
		// Initial load
		refreshHealth();

		// Auto-refresh every 30 seconds if enabled
		let interval: NodeJS.Timeout | undefined;
		if (autoRefresh) {
			interval = setInterval(refreshHealth, 30000);
		}

		return () => {
			if (interval) {
				clearInterval(interval);
			}
		};
	}, [autoRefresh]);

	const getStatusIcon = (isValid: boolean) => {
		return isValid ? '✅' : '❌';
	};

	const getOverallStatus = () => {
		if (!healthStatus) return 'unknown';
		
		const validProviders = healthStatus.apiKeys.valid;
		const totalProviders = healthStatus.apiKeys.total;
		
		if (validProviders === 0) return 'critical';
		if (validProviders < totalProviders / 2) return 'warning';
		return 'healthy';
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'healthy': return '#28a745';
			case 'warning': return '#ffc107';
			case 'critical': return '#dc3545';
			default: return '#6c757d';
		}
	};

	if (!healthStatus) {
		return (
			<div className="health-dashboard loading">
				<div className="loading-indicator">
					<span>🔄</span>
					<span>Loading health status...</span>
				</div>
			</div>
		);
	}

	const overallStatus = getOverallStatus();
	const errorHealthStatus = errorStatus?.status || 'unknown';

	return (
		<div className="health-dashboard">
			<style>{`
				.health-dashboard {
					padding: 20px;
					background: var(--vscode-editor-background);
					color: var(--vscode-editor-foreground);
					font-family: var(--vscode-font-family);
					border-radius: 8px;
					margin: 16px;
				}
				
				.health-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 20px;
					padding-bottom: 10px;
					border-bottom: 1px solid var(--vscode-panel-border);
				}
				
				.health-title {
					font-size: 18px;
					font-weight: bold;
					color: var(--vscode-foreground);
				}
				
				.health-controls {
					display: flex;
					gap: 10px;
					align-items: center;
				}
				
				.status-badge {
					padding: 4px 8px;
					border-radius: 4px;
					font-size: 12px;
					font-weight: bold;
					text-transform: uppercase;
				}
				
				.status-sections {
					display: grid;
					grid-template-columns: 1fr 1fr;
					gap: 20px;
					margin-bottom: 20px;
				}
				
				.status-section {
					background: var(--vscode-panel-background);
					border: 1px solid var(--vscode-panel-border);
					border-radius: 6px;
					padding: 16px;
				}
				
				.section-title {
					font-weight: bold;
					margin-bottom: 12px;
					color: var(--vscode-foreground);
				}
				
				.provider-list {
					display: flex;
					flex-direction: column;
					gap: 8px;
				}
				
				.provider-item {
					display: flex;
					justify-content: space-between;
					align-items: center;
					padding: 6px 0;
				}
				
				.provider-name {
					font-family: var(--vscode-editor-font-family);
					text-transform: capitalize;
				}
				
				.provider-status {
					display: flex;
					align-items: center;
					gap: 6px;
					font-size: 12px;
				}
				
				.error-summary {
					margin-top: 20px;
				}
				
				.error-stats {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
					gap: 10px;
					margin-bottom: 12px;
				}
				
				.error-stat {
					text-align: center;
					padding: 8px;
					background: var(--vscode-input-background);
					border-radius: 4px;
				}
				
				.error-stat-value {
					font-size: 18px;
					font-weight: bold;
					display: block;
				}
				
				.error-stat-label {
					font-size: 11px;
					opacity: 0.8;
					text-transform: uppercase;
				}
				
				.refresh-info {
					text-align: center;
					font-size: 11px;
					opacity: 0.7;
					margin-top: 16px;
				}
				
				.loading {
					display: flex;
					justify-content: center;
					align-items: center;
					min-height: 200px;
				}
				
				.loading-indicator {
					display: flex;
					flex-direction: column;
					align-items: center;
					gap: 10px;
				}
				
				.button {
					background: var(--vscode-button-background);
					color: var(--vscode-button-foreground);
					border: none;
					padding: 6px 12px;
					border-radius: 4px;
					cursor: pointer;
					font-size: 12px;
				}
				
				.button:hover {
					background: var(--vscode-button-hoverBackground);
				}
				
				.toggle {
					display: flex;
					align-items: center;
					gap: 6px;
					font-size: 12px;
				}
				
				@media (max-width: 600px) {
					.status-sections {
						grid-template-columns: 1fr;
					}
					
					.error-stats {
						grid-template-columns: repeat(2, 1fr);
					}
				}
			`}</style>
			
			<div className="health-header">
				<h3 className="health-title">🩺 API Health Dashboard</h3>
				<div className="health-controls">
					<span 
						className="status-badge"
						style={{ 
							backgroundColor: getStatusColor(overallStatus),
							color: 'white'
						}}
					>
						{overallStatus}
					</span>
					<label className="toggle">
						<input
							type="checkbox"
							checked={autoRefresh}
							onChange={(e) => setAutoRefresh(e.target.checked)}
						/>
						Auto-refresh
					</label>
					<button className="button" onClick={refreshHealth}>
						🔄 Refresh
					</button>
				</div>
			</div>

			<div className="status-sections">
				<div className="status-section">
					<div className="section-title">API Providers</div>
					<div className="provider-list">
						{healthStatus.apiKeys.providers.map((provider, index) => (
							<div key={index} className="provider-item">
								<span className="provider-name">{provider.provider}</span>
								<div className="provider-status">
									<span>{getStatusIcon(provider.isValid)}</span>
									<span>{provider.isValid ? 'Valid' : 'Invalid'}</span>
									{provider.key && (
										<span style={{ opacity: 0.7 }}>({provider.key})</span>
									)}
								</div>
							</div>
						))}
					</div>
					<div style={{ marginTop: '12px', fontSize: '12px', opacity: 0.8 }}>
						{healthStatus.apiKeys.valid} of {healthStatus.apiKeys.total} providers configured
					</div>
				</div>

				<div className="status-section">
					<div className="section-title">System Status</div>
					<div className="provider-list">
						<div className="provider-item">
							<span>Environment</span>
							<span>{healthStatus.environment}</span>
						</div>
						<div className="provider-item">
							<span>Supabase URL</span>
							<span>{getStatusIcon(healthStatus.supabase?.url === 'configured')}</span>
						</div>
						<div className="provider-item">
							<span>Supabase Key</span>
							<span>{getStatusIcon(healthStatus.supabase?.anonKey === 'configured')}</span>
						</div>
						<div className="provider-item">
							<span>Error Status</span>
							<span 
								style={{ 
									color: getStatusColor(errorHealthStatus),
									fontWeight: 'bold'
								}}
							>
								{errorHealthStatus}
							</span>
						</div>
					</div>
				</div>
			</div>

			{errorStatus?.summary && (
				<div className="error-summary">
					<div className="section-title">Error Summary</div>
					<div className="error-stats">
						<div className="error-stat">
							<span className="error-stat-value">{errorStatus.summary.totalErrors}</span>
							<span className="error-stat-label">Total</span>
						</div>
						<div className="error-stat">
							<span className="error-stat-value">{errorStatus.summary.recentErrors}</span>
							<span className="error-stat-label">Recent</span>
						</div>
						<div className="error-stat">
							<span className="error-stat-value">{Object.keys(errorStatus.summary.providerErrors).length}</span>
							<span className="error-stat-label">Providers</span>
						</div>
						<div className="error-stat">
							<span className="error-stat-value">{errorStatus.summary.topErrors.length}</span>
							<span className="error-stat-label">Types</span>
						</div>
					</div>
					
					{errorStatus.summary.topErrors.length > 0 && (
						<div>
							<div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
								Most Common Errors:
							</div>
							{errorStatus.summary.topErrors.slice(0, 3).map((error: any, index: number) => (
								<div key={index} style={{ 
									fontSize: '12px', 
									opacity: 0.8, 
									marginBottom: '4px',
									padding: '4px',
									background: 'var(--vscode-input-background)',
									borderRadius: '3px'
								}}>
									<strong>{error.count}x</strong> {error.message.substring(0, 60)}
									{error.message.length > 60 && '...'}
								</div>
							))}
						</div>
					)}
				</div>
			)}

			<div className="refresh-info">
				Last updated: {lastUpdated.toLocaleTimeString()}
				{autoRefresh && ' • Auto-refresh enabled (30s)'}
			</div>
		</div>
	);
};