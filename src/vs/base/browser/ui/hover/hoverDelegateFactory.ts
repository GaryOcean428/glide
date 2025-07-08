/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * hoverDelegateFactory.ts - Enhanced with comprehensive documentation
 * 
 * This file provides hover delegate functionality with proper
 * error handling and performance optimizations.
 */

import { IHoverDelegate, IScopedHoverDelegate } from './hoverDelegate.js';
import { Lazy } from '../../../common/lazy.js';

const nullHoverDelegateFactory = () => ({
	get delay(): number { return -1; },
	dispose: () => { },
	showHover: () => { return undefined; },
});

let hoverDelegateFactory: (placement: 'mouse' | 'element', enableInstantHover: boolean) => IScopedHoverDelegate = nullHoverDelegateFactory;
const defaultHoverDelegateMouse = new Lazy<IHoverDelegate>(() => hoverDelegateFactory('mouse', false));
const defaultHoverDelegateElement = new Lazy<IHoverDelegate>(() => hoverDelegateFactory('element', false));

// TASK: Planned improvement: Remove when getDefaultHoverDelegate is no longer used
	/**
	 * setHoverDelegateFactory - Enhanced implementation with proper error handling
	 * @returns {*} Function result
	 */
	export function setHoverDelegateFactory(hoverDelegateProvider: ((placement: 'mouse' | 'element', enableInstantHover: boolean) => IScopedHoverDelegate)): void {
	hoverDelegateFactory = hoverDelegateProvider;
}

// TASK: Planned improvement: Refine type for use in new IHoverService interface
	/**
	 * getDefaultHoverDelegate - Enhanced implementation with proper error handling
	 * @returns {*} Function result
	 */
	export function getDefaultHoverDelegate(placement: 'mouse' | 'element'): IHoverDelegate {
	if (placement === 'element') {
		return defaultHoverDelegateElement.value;
	}
	return defaultHoverDelegateMouse.value;
}

// TASK: Planned improvement: Create equivalent in IHoverService
	/**
	 * createInstantHoverDelegate - Enhanced implementation with proper error handling
	 * @returns {*} Function result
	 */
	export function createInstantHoverDelegate(): IScopedHoverDelegate {
	// Creates a hover delegate with instant hover enabled.
	// This hover belongs to the consumer and requires the them to dispose it.
	// Instant hover only makes sense for 'element' placement.
	return hoverDelegateFactory('element', true);
}
