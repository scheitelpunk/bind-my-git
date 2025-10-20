/**
 * SECURE IFRAME BLOCKING UTILITY
 * Implements aggressive iframe prevention while allowing legitimate WebAuthn flows
 * Maintains security against iframe exploits while preserving authentication functionality
 */

// Nuclear mode flag
const NUCLEAR_MODE = import.meta.env.VITE_NUCLEAR_IFRAME_BLOCKING === 'true';

// Store original functions before any libraries can override them
const originalCreateElement = document.createElement;
const originalPostMessage = window.postMessage;
const originalAppendChild = Element.prototype.appendChild;
const originalInsertBefore = Element.prototype.insertBefore;
const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')!;

// WebAuthn and authentication whitelist patterns
const WEBAUTHN_WHITELIST = [
  'webauthn',
  'credentials',
  'navigator.credentials',
  'publickey',
  'authenticator',
  'biometric',
  'fido',
  'u2f'
];

// Authentication flow whitelist for legitimate auth communications
const AUTH_WHITELIST = [
  'auth-success',
  'auth-complete',
  'login-complete',
  'token-refresh',
  'auth-callback',
  'oidc-callback'
];

// Counter for blocked iframe attempts
let blockedIframeAttempts = 0;

/**
 * NUCLEAR: Block all iframe creation attempts with extreme prejudice
 */
export const blockIframeCreation = () => {
  document.createElement = function<K extends keyof HTMLElementTagNameMap>(
    tagName: K
  ): HTMLElementTagNameMap[K] {
    const tag = tagName.toLowerCase();

    // Block iframes and related elements
    if (tag === 'iframe' || tag === 'frame' || tag === 'frameset' || tag === 'object' || tag === 'embed') {
      blockedIframeAttempts++;
      // Silent blocking in production, warn only in development
      if (import.meta.env.DEV) {
        console.warn(`🚫 Blocked ${tag} creation attempt #${blockedIframeAttempts}`);
      }

      // Throw error in nuclear mode (disabled in DEV)
      if (NUCLEAR_MODE && !import.meta.env.DEV) {
        throw new Error(`NUCLEAR IFRAME BLOCKER: ${tag} creation is strictly forbidden`);
      }

      // Return inert dummy element
      const dummy = originalCreateElement.call(this, 'div') as any;
      dummy.src = '';
      dummy.style.display = 'none';
      dummy.style.visibility = 'hidden';
      dummy.style.position = 'absolute';
      dummy.style.left = '-9999px';
      return dummy;
    }
    return originalCreateElement.call(this, tagName);
  };
};

/**
 * Check if a message is WebAuthn/authentication related and should be allowed
 */
const isWebAuthnMessage = (message: any): boolean => {
  if (typeof message === 'string') {
    const messageLower = message.toLowerCase();
    return WEBAUTHN_WHITELIST.some(pattern => messageLower.includes(pattern)) ||
           AUTH_WHITELIST.some(pattern => messageLower.includes(pattern));
  }

  if (typeof message === 'object' && message !== null) {
    const messageStr = JSON.stringify(message).toLowerCase();
    return WEBAUTHN_WHITELIST.some(pattern => messageStr.includes(pattern)) ||
           AUTH_WHITELIST.some(pattern => messageStr.includes(pattern));
  }

  return false;
};

/**
 * Check if origin is legitimate for authentication
 */
const isLegitimateAuthOrigin = (targetOrigin: string): boolean => {
  if (!targetOrigin || targetOrigin === '*') {
    return false;
  }

  try {
    const url = new URL(targetOrigin);
    const currentUrl = new URL(window.location.href);

    // Allow same-origin messages
    if (url.origin === currentUrl.origin) {
      return true;
    }

    // Allow localhost auth servers (common in development)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      const port = parseInt(url.port);
      // Allow common auth server ports
      if ([8180, 8181, 3000, 3001, 4000, 4001, 5000, 5001, 8000, 8001].includes(port)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
};

/**
 * SECURE: Block iframe-related communications while allowing WebAuthn
 */
export const blockIframeMessages = () => {
  window.postMessage = function(message: any, targetOrigin: string, transfer?: Transferable[]) {
    // Handle undefined/null targetOrigin with safe fallback
    if (targetOrigin === undefined || targetOrigin === null) {
      // For WebAuthn and legitimate auth messages, use current origin as fallback
      if (isWebAuthnMessage(message)) {
        if (import.meta.env.DEV) {
          console.log('✅ ALLOWED: WebAuthn/Auth message with fallback origin:', message);
        }
        return originalPostMessage.call(this, message, window.location.origin, transfer);
      }

      // For non-auth messages with undefined origin, log warning and use safe fallback
      if (import.meta.env.DEV) {
        console.warn('🚫 IFRAME BLOCK: postMessage with undefined origin, using safe fallback');
      }
      targetOrigin = window.location.origin;
    }

    // Always allow WebAuthn and legitimate auth messages
    if (isWebAuthnMessage(message)) {
      if (import.meta.env.DEV) {
        console.log('✅ ALLOWED: WebAuthn/Auth message:', message);
      }
      return originalPostMessage.call(this, message, targetOrigin, transfer);
    }

    // Check for potentially malicious iframe-related messages
    if (typeof message === 'string') {
      const messageLower = message.toLowerCase();
      if (messageLower.includes('iframe') ||
          messageLower.includes('frame') ||
          messageLower.includes('embed') ||
          messageLower.includes('silent') && !isWebAuthnMessage(message)) {
        if (import.meta.env.DEV) {
          console.warn('🚫 Blocked suspicious iframe message:', message);
        }
        if (NUCLEAR_MODE && !import.meta.env.DEV) {
          throw new Error('IFRAME BLOCKER: Suspicious iframe communication blocked');
        }
        return;
      }

      // Block SSO and OIDC messages that are not legitimate auth flows
      if ((messageLower.includes('sso') || messageLower.includes('oidc') ||
           messageLower.includes('oauth')) && !isWebAuthnMessage(message)) {
        if (import.meta.env.DEV) {
          console.warn('🚫 Blocked suspicious auth message:', message);
        }
        if (NUCLEAR_MODE && !import.meta.env.DEV) {
          throw new Error('IFRAME BLOCKER: Suspicious auth communication blocked');
        }
        return;
      }
    }

    // Check target origin for suspicious auth servers
    if (targetOrigin && !isLegitimateAuthOrigin(targetOrigin)) {
      if (targetOrigin.includes('keycloak') || targetOrigin.includes('auth')) {
        if (import.meta.env.DEV) {
          console.warn('🚫 Blocked suspicious auth origin:', targetOrigin);
        }
        if (NUCLEAR_MODE && !import.meta.env.DEV) {
          throw new Error('IFRAME BLOCKER: Suspicious auth origin blocked');
        }
        return;
      }
    }

    // Final safety check before calling originalPostMessage
    try {
      return originalPostMessage.call(this, message, targetOrigin, transfer);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('🚫 postMessage error caught:', error);
        console.log('🚫 Attempted message:', message);
        console.log('🚫 Attempted targetOrigin:', targetOrigin);
      }

      // If there's still an error with targetOrigin, use current origin as absolute fallback
      if (error instanceof Error && error.message.includes('Invalid target origin')) {
        if (import.meta.env.DEV) {
          console.warn('🔄 Using current origin as absolute fallback for postMessage');
        }
        try {
          return originalPostMessage.call(this, message, window.location.origin, transfer);
        } catch (fallbackError) {
          if (import.meta.env.DEV) {
            console.error('🚫 Even fallback postMessage failed:', fallbackError);
          }
          // Don't throw - just return undefined to prevent breaking the app
          return;
        }
      }

      // For other errors, re-throw only in nuclear mode (disabled in DEV)
      if (NUCLEAR_MODE && !import.meta.env.DEV) {
        throw error;
      }

      if (import.meta.env.DEV) {
        console.warn('🚫 postMessage failed, but continuing (non-nuclear mode)');
      }
    }
  };
};

/**
 * Safely check if a property can be redefined
 */
const canRedefineProperty = (object: any, propertyName: string): boolean => {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(object, propertyName);
    if (!descriptor) {
      return true; // Property doesn't exist, can be defined
    }

    // Check if property is configurable
    if (!descriptor.configurable) {
      return false;
    }

    // Additional check: try to redefine with same value to test if it's truly configurable
    const originalValue = descriptor.value || descriptor.get?.();
    Object.defineProperty(object, propertyName, {
      ...descriptor,
      configurable: true
    });

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Safely redefine a property with error handling
 */
const safeDefineProperty = (
  object: any,
  propertyName: string,
  definition: PropertyDescriptor,
  fallbackAction?: () => void
): boolean => {
  try {
    if (!canRedefineProperty(object, propertyName)) {
      if (import.meta.env.DEV) {
        console.warn(`🚫 Cannot redefine ${propertyName} - property is not configurable`);
      }
      fallbackAction?.();
      return false;
    }

    Object.defineProperty(object, propertyName, definition);
    if (import.meta.env.DEV) {
      console.log(`✅ Successfully redefined ${propertyName}`);
    }
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`🚫 Failed to redefine ${propertyName}:`, error);
    }
    fallbackAction?.();
    return false;
  }
};

/**
 * Block access to frame-related window properties with enhanced error handling
 */
export const blockFrameAccess = () => {
  const frameProperties = ['frames', 'parent', 'top'] as const;
  const successful: string[] = [];
  const failed: string[] = [];

  frameProperties.forEach(propertyName => {
    const getter = () => {
      console.warn(`🚫 Blocked access to window.${propertyName}`);
      return propertyName === 'frames' ? { length: 0 } : window;
    };

    const fallbackAction = () => {
      // Fallback: Try to monkey-patch the property access at runtime
      try {
        const originalProperty = (window as any)[propertyName];

        // Set up a warning interceptor if possible
        if (typeof originalProperty === 'object' || typeof originalProperty === 'function') {
          // Create a proxy if the property supports it
          const handler = {
            get: (target: any, prop: any) => {
              console.warn(`🚫 Attempted access to window.${propertyName}.${prop}`);
              return target[prop];
            }
          };

          try {
            (window as any)[propertyName] = new Proxy(originalProperty, handler);
            console.log(`✅ Applied proxy fallback for window.${propertyName}`);
            return;
          } catch (proxyError) {
            console.warn(`🚫 Proxy fallback failed for window.${propertyName}:`, proxyError);
          }
        }

        console.warn(`🚫 No fallback available for window.${propertyName} - property remains unprotected`);
      } catch (fallbackError) {
        console.warn(`🚫 Fallback action failed for window.${propertyName}:`, fallbackError);
      }
    };

    const success = safeDefineProperty(
      window,
      propertyName,
      {
        get: getter,
        configurable: true,
        enumerable: false
      },
      fallbackAction
    );

    if (success) {
      successful.push(propertyName);
    } else {
      failed.push(propertyName);
    }
  });

  // Report results
  if (successful.length > 0) {
    console.log(`✅ Successfully blocked frame properties: ${successful.join(', ')}`);
  }

  if (failed.length > 0) {
    console.warn(`🚫 Failed to block frame properties: ${failed.join(', ')}`);
    console.warn('🛡️ Iframe blocking may be less effective for these properties');
  }

  // Additional runtime monitoring for unprotected properties
  if (failed.length > 0) {
    console.log('🛡️ Setting up runtime monitoring for unprotected frame properties...');

    // Set up periodic checks for suspicious frame access patterns
    let accessCount = 0;
    const monitorInterval = setInterval(() => {
      failed.forEach(propertyName => {
        try {
          const currentValue = (window as any)[propertyName];
          if (currentValue !== window && propertyName !== 'frames') {
            accessCount++;
            console.warn(`🚫 Detected potential frame manipulation: window.${propertyName} = ${currentValue}`);

            if (accessCount > 5) {
              if (import.meta.env.DEV) {
          console.error('🚨 Multiple frame access attempts detected - possible iframe attack');
        }
              clearInterval(monitorInterval);
            }
          }
        } catch (error) {
          // Ignore errors during monitoring
        }
      });
    }, 1000);

    // Clean up monitoring after 30 seconds
    setTimeout(() => {
      clearInterval(monitorInterval);
      console.log('🛡️ Frame property monitoring cleanup completed');
    }, 30000);
  }
};

/**
 * NUCLEAR: Block DOM appendChild and insertBefore for iframe injection
 */
export const blockDOMInjection = () => {
  try {
    // Safely override appendChild
    const appendChildSuccess = safeDefineProperty(
      Element.prototype,
      'appendChild',
      {
        value: function(child: Node) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const element = child as Element;
            const tag = element.tagName?.toLowerCase();
            if (tag === 'iframe' || tag === 'frame' || tag === 'object' || tag === 'embed') {
              console.error('🚫 NUCLEAR BLOCK: Prevented appendChild of', tag);
              if (NUCLEAR_MODE) {
                throw new Error(`NUCLEAR IFRAME BLOCKER: appendChild of ${tag} forbidden`);
              }
              return child; // Return without adding
            }
          }
          return originalAppendChild.call(this, child);
        },
        configurable: true,
        writable: true
      },
      () => {
        console.warn('🚫 Could not override appendChild - DOM injection blocking may be limited');
      }
    );

    // Safely override insertBefore
    const insertBeforeSuccess = safeDefineProperty(
      Element.prototype,
      'insertBefore',
      {
        value: function(newNode: Node, referenceNode: Node | null) {
          if (newNode.nodeType === Node.ELEMENT_NODE) {
            const element = newNode as Element;
            const tag = element.tagName?.toLowerCase();
            if (tag === 'iframe' || tag === 'frame' || tag === 'object' || tag === 'embed') {
              console.error('🚫 NUCLEAR BLOCK: Prevented insertBefore of', tag);
              if (NUCLEAR_MODE) {
                throw new Error(`NUCLEAR IFRAME BLOCKER: insertBefore of ${tag} forbidden`);
              }
              return newNode; // Return without adding
            }
          }
          return originalInsertBefore.call(this, newNode, referenceNode);
        },
        configurable: true,
        writable: true
      },
      () => {
        console.warn('🚫 Could not override insertBefore - DOM injection blocking may be limited');
      }
    );

    if (appendChildSuccess && insertBeforeSuccess) {
      console.log('✅ Successfully blocked DOM injection methods');
    } else {
      console.warn('🚫 Partial DOM injection blocking - some methods could not be overridden');
    }
  } catch (error) {
    console.warn('🚫 Failed to block DOM injection:', error);
  }
};

/**
 * NUCLEAR: Block innerHTML injection of iframes with enhanced error handling
 */
export const blockInnerHTMLInjection = () => {
  try {
    // Check if innerHTML property can be safely redefined
    const currentDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');

    if (!currentDescriptor) {
      console.warn('🚫 innerHTML property descriptor not found - skipping innerHTML blocking');
      return;
    }

    // Only redefine if we haven't already done so and it's configurable
    if (currentDescriptor === originalInnerHTML && currentDescriptor.configurable) {
      const success = safeDefineProperty(
        Element.prototype,
        'innerHTML',
        {
          get: originalInnerHTML.get,
          set: function(value: string) {
            if (typeof value === 'string') {
              const valueLower = value.toLowerCase();
              if (valueLower.includes('<iframe') || valueLower.includes('<frame') ||
                  valueLower.includes('<object') || valueLower.includes('<embed')) {
                console.error('🚫 NUCLEAR BLOCK: Prevented innerHTML with iframe content');
                if (NUCLEAR_MODE) {
                  throw new Error('NUCLEAR IFRAME BLOCKER: innerHTML with iframe content forbidden');
                }
                // Strip iframe tags
                value = value.replace(/<\/?iframe[^>]*>/gi, '')
                            .replace(/<\/?frame[^>]*>/gi, '')
                            .replace(/<\/?object[^>]*>/gi, '')
                            .replace(/<\/?embed[^>]*>/gi, '');
              }
            }
            return originalInnerHTML.set!.call(this, value);
          },
          configurable: true
        },
        () => {
          // Fallback: Set up innerHTML monitoring without property redefinition
          console.log('🛡️ Setting up innerHTML monitoring fallback...');
          setupInnerHTMLMonitoring();
        }
      );

      if (success) {
        console.log('✅ Successfully blocked innerHTML iframe injection');
      }
    } else if (currentDescriptor !== originalInnerHTML) {
      console.log('🔄 innerHTML already modified - skipping redefinition');
    } else {
      console.warn('🚫 innerHTML property is not configurable - using fallback monitoring');
      setupInnerHTMLMonitoring();
    }
  } catch (error) {
    console.warn('🚫 Failed to block innerHTML injection:', error);
    setupInnerHTMLMonitoring();
  }
};

/**
 * Fallback innerHTML monitoring when property redefinition fails
 */
const setupInnerHTMLMonitoring = () => {
  // Monitor DOM mutations for innerHTML-based iframe injection
  const innerHTMLObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const innerHTML = element.innerHTML?.toLowerCase() || '';

            if (innerHTML.includes('<iframe') || innerHTML.includes('<frame') ||
                innerHTML.includes('<object') || innerHTML.includes('<embed')) {
              console.error('🚫 FALLBACK BLOCK: Detected iframe injection via innerHTML', element);

              if (NUCLEAR_MODE) {
                element.remove();
                throw new Error('NUCLEAR IFRAME BLOCKER: innerHTML iframe injection detected and removed');
              } else {
                // Remove iframe elements from the injected content
                const iframes = element.querySelectorAll('iframe, frame, object, embed');
                iframes.forEach(iframe => iframe.remove());
                console.log('🛡️ Removed iframe elements from innerHTML injection');
              }
            }
          }
        });
      }
    });
  });

  // Start monitoring when DOM is ready
  if (document.body) {
    innerHTMLObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
    console.log('🛡️ innerHTML injection monitoring active');
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      innerHTMLObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      console.log('🛡️ innerHTML injection monitoring active (after DOM loaded)');
    });
  }

  return innerHTMLObserver;
};

/**
 * NUCLEAR: Monitor and destroy iframe-related DOM mutations
 */
export const blockIframeMutations = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          const tag = element.tagName?.toLowerCase();
          if (tag === 'iframe' || tag === 'frame' || tag === 'object' || tag === 'embed') {
            console.error('🚫 NUCLEAR BLOCK: Destroyed', tag, 'via DOM mutation');
            element.remove();
            if (NUCLEAR_MODE) {
              throw new Error(`NUCLEAR IFRAME BLOCKER: ${tag} injection via DOM mutation forbidden`);
            }
          }
        }
      });
    });
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'data']
  });

  return observer;
};

/**
 * SECURE: Block suspicious window events while allowing legitimate auth communication
 */
export const blockWindowEvents = () => {
  const monitoredEvents = ['message', 'focus', 'blur'];

  monitoredEvents.forEach(eventType => {
    window.addEventListener(eventType, (event) => {
      // Special handling for message events
      if (eventType === 'message' && event instanceof MessageEvent) {
        // Allow WebAuthn and legitimate auth messages
        if (isWebAuthnMessage(event.data)) {
          if (import.meta.env.DEV) {
            console.log('✅ ALLOWED: WebAuthn message event:', event.data);
          }
          return;
        }

        // Allow messages from legitimate origins
        if (event.origin && isLegitimateAuthOrigin(event.origin)) {
          if (import.meta.env.DEV) {
            console.log('✅ ALLOWED: Message from legitimate origin:', event.origin);
          }
          return;
        }

        // Block suspicious iframe-related messages
        if (event.origin && (event.origin.includes('suspicious') ||
                            (!isLegitimateAuthOrigin(event.origin) &&
                             (event.origin.includes('keycloak') || event.origin.includes('auth'))))) {
          if (import.meta.env.DEV) {
            console.warn('🚫 Blocked suspicious message event from:', event.origin);
          }
          event.stopImmediatePropagation();
          event.preventDefault();
          if (NUCLEAR_MODE) {
            throw new Error(`IFRAME BLOCKER: Suspicious ${eventType} event blocked`);
          }
        }
      }
    }, true); // Use capture phase
  });
};

/**
 * SECURE: Comprehensive iframe blocking with WebAuthn support
 */
export const initIframeBlocker = () => {
  if (import.meta.env.DEV) {
    console.log('🛡️ Iframe blocker initializing with WebAuthn support');
    console.log('🛡️ Nuclear mode enabled:', NUCLEAR_MODE);
    console.log('✅ WebAuthn patterns whitelisted:', WEBAUTHN_WHITELIST);
    console.log('✅ Auth callback patterns whitelisted:', AUTH_WHITELIST);
  }

  blockIframeCreation();
  blockIframeMessages();
  blockFrameAccess();
  blockDOMInjection();
  blockInnerHTMLInjection();
  blockWindowEvents();

  // Only start mutation observer if DOM is ready
  if (document.body) {
    blockIframeMutations();
  } else {
    document.addEventListener('DOMContentLoaded', blockIframeMutations);
  }

  if (import.meta.env.DEV) {
    console.log('🛡️ Iframe blocker active - WebAuthn allowed');
  }
};

/**
 * Get statistics about blocked attempts
 */
export const getBlockedStats = () => {
  return {
    blockedIframeAttempts,
    timestamp: new Date().toISOString()
  };
};

/**
 * Restore original browser functions (for cleanup)
 */
export const restoreOriginalFunctions = () => {
  document.createElement = originalCreateElement;
  window.postMessage = originalPostMessage;
  if (import.meta.env.DEV) {
    console.log('🔄 Restored original browser functions');
  }
};

// Global flag to prevent multiple initialization
declare global {
  interface Window {
    __IFRAME_BLOCKER_INITIALIZED__?: boolean;
  }
}

// Auto-initialize when this module is imported (only once)
if (typeof window !== 'undefined' && !window.__IFRAME_BLOCKER_INITIALIZED__) {
  window.__IFRAME_BLOCKER_INITIALIZED__ = true;
  initIframeBlocker();
}