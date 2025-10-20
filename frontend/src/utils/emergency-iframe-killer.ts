/**
 * EMERGENCY IFRAME KILLER
 * The most aggressive iframe blocking solution possible
 * This is a nuclear option to completely eliminate iframe usage
 */

// Emergency kill switch - DISABLED in development to prevent conflicts
const EMERGENCY_MODE = import.meta.env.VITE_EMERGENCY_MODE === 'true' && !import.meta.env.DEV;

// Track all blocked attempts
let totalBlocked = 0;

/**
 * EMERGENCY: Kill all existing iframes in the DOM
 */
export const killAllExistingIframes = () => {
  const existingIframes = document.querySelectorAll('iframe, frame, object, embed');
  existingIframes.forEach((iframe, index) => {
    if (import.meta.env.DEV) {
      console.warn(`🛑 Removing existing ${iframe.tagName} #${index + 1}`);
    }
    iframe.remove();
    totalBlocked++;
  });

  if (existingIframes.length > 0) {
    if (import.meta.env.DEV) {
      console.warn(`🛑 Removed ${existingIframes.length} existing iframes`);
    }
  }
};

/**
 * EMERGENCY: Override ALL possible iframe creation methods
 */
export const overrideAllIframeMethods = () => {
  // Store originals
  const originals = {
    createElement: document.createElement,
    appendChild: Element.prototype.appendChild,
    insertBefore: Element.prototype.insertBefore,
    replaceChild: Element.prototype.replaceChild,
    innerHTML: Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')!,
    outerHTML: Object.getOwnPropertyDescriptor(Element.prototype, 'outerHTML')!,
    insertAdjacentHTML: Element.prototype.insertAdjacentHTML
  };

  const FORBIDDEN_TAGS = ['iframe', 'frame', 'frameset', 'object', 'embed'];

  // Override createElement
  document.createElement = function(tagName: any) {
    const tag = String(tagName).toLowerCase();
    if (FORBIDDEN_TAGS.includes(tag)) {
      totalBlocked++;
      if (import.meta.env.DEV) {
        console.warn(`🛑 Blocked createElement(${tag}) #${totalBlocked}`);
      }

      if (EMERGENCY_MODE) {
        throw new Error(`EMERGENCY IFRAME KILLER: ${tag} creation is absolutely forbidden`);
      }

      const dummy = originals.createElement.call(this, 'div');
      dummy.style.display = 'none';
      return dummy;
    }
    return originals.createElement.call(this, tagName);
  };

  // Override appendChild
  Element.prototype.appendChild = function(child: any) {
    if (child && child.tagName && FORBIDDEN_TAGS.includes(child.tagName.toLowerCase())) {
      totalBlocked++;
      if (import.meta.env.DEV) {
        console.warn(`🛑 Blocked appendChild(${child.tagName}) #${totalBlocked}`);
      }

      if (EMERGENCY_MODE) {
        throw new Error(`EMERGENCY IFRAME KILLER: appendChild of ${child.tagName} forbidden`);
      }
      return child;
    }
    return originals.appendChild.call(this, child);
  };

  // Override insertBefore
  Element.prototype.insertBefore = function(newNode: any, referenceNode: any) {
    if (newNode && newNode.tagName && FORBIDDEN_TAGS.includes(newNode.tagName.toLowerCase())) {
      totalBlocked++;
      if (import.meta.env.DEV) {
        console.warn(`🛑 Blocked insertBefore(${newNode.tagName}) #${totalBlocked}`);
      }

      if (EMERGENCY_MODE) {
        throw new Error(`EMERGENCY IFRAME KILLER: insertBefore of ${newNode.tagName} forbidden`);
      }
      return newNode;
    }
    return originals.insertBefore.call(this, newNode, referenceNode);
  };

  // Override replaceChild
  Element.prototype.replaceChild = function(newChild: any, oldChild: any) {
    if (newChild && newChild.tagName && FORBIDDEN_TAGS.includes(newChild.tagName.toLowerCase())) {
      totalBlocked++;
      if (import.meta.env.DEV) {
        console.warn(`🛑 Blocked replaceChild(${newChild.tagName}) #${totalBlocked}`);
      }

      if (EMERGENCY_MODE) {
        throw new Error(`EMERGENCY IFRAME KILLER: replaceChild with ${newChild.tagName} forbidden`);
      }
      return oldChild;
    }
    return originals.replaceChild.call(this, newChild, oldChild);
  };

  // Override innerHTML
  Object.defineProperty(Element.prototype, 'innerHTML', {
    get: originals.innerHTML.get,
    set: function(value: string) {
      if (typeof value === 'string') {
        const hasIframe = FORBIDDEN_TAGS.some(tag =>
          value.toLowerCase().includes(`<${tag}`) || value.toLowerCase().includes(`</${tag}`)
        );

        if (hasIframe) {
          totalBlocked++;
          if (import.meta.env.DEV) {
            console.warn(`🛑 Blocked innerHTML with iframe content #${totalBlocked}`);
          }

          if (EMERGENCY_MODE) {
            throw new Error('EMERGENCY IFRAME KILLER: innerHTML with iframe content forbidden');
          }

          // Strip all iframe-related tags
          value = FORBIDDEN_TAGS.reduce((html, tag) => {
            const regex = new RegExp(`<\\/?${tag}[^>]*>`, 'gi');
            return html.replace(regex, '');
          }, value);
        }
      }
      return originals.innerHTML.set!.call(this, value);
    },
    configurable: true
  });

  // Override outerHTML
  Object.defineProperty(Element.prototype, 'outerHTML', {
    get: originals.outerHTML.get,
    set: function(value: string) {
      if (typeof value === 'string') {
        const hasIframe = FORBIDDEN_TAGS.some(tag =>
          value.toLowerCase().includes(`<${tag}`) || value.toLowerCase().includes(`</${tag}`)
        );

        if (hasIframe) {
          totalBlocked++;
          if (import.meta.env.DEV) {
            console.warn(`🛑 Blocked outerHTML with iframe content #${totalBlocked}`);
          }

          if (EMERGENCY_MODE) {
            throw new Error('EMERGENCY IFRAME KILLER: outerHTML with iframe content forbidden');
          }

          // Strip all iframe-related tags
          value = FORBIDDEN_TAGS.reduce((html, tag) => {
            const regex = new RegExp(`<\\/?${tag}[^>]*>`, 'gi');
            return html.replace(regex, '');
          }, value);
        }
      }
      return originals.outerHTML.set!.call(this, value);
    },
    configurable: true
  });

  // Override insertAdjacentHTML
  Element.prototype.insertAdjacentHTML = function(position: any, text: string) {
    if (typeof text === 'string') {
      const hasIframe = FORBIDDEN_TAGS.some(tag =>
        text.toLowerCase().includes(`<${tag}`) || text.toLowerCase().includes(`</${tag}`)
      );

      if (hasIframe) {
        totalBlocked++;
        if (import.meta.env.DEV) {
          console.warn(`🛑 Blocked insertAdjacentHTML with iframe content #${totalBlocked}`);
        }

        if (EMERGENCY_MODE) {
          throw new Error('EMERGENCY IFRAME KILLER: insertAdjacentHTML with iframe content forbidden');
        }

        // Strip all iframe-related tags
        text = FORBIDDEN_TAGS.reduce((html, tag) => {
          const regex = new RegExp(`<\\/?${tag}[^>]*>`, 'gi');
          return html.replace(regex, '');
        }, text);
      }
    }
    return originals.insertAdjacentHTML.call(this, position, text);
  };

  if (import.meta.env.DEV) {
    console.log('🛑 Emergency iframe blocking methods active');
  }
};

/**
 * EMERGENCY: Nuclear mutation observer
 */
export const startNuclearMutationObserver = () => {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Check added nodes
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          const tag = element.tagName?.toLowerCase();

          if (['iframe', 'frame', 'object', 'embed'].includes(tag)) {
            totalBlocked++;
            if (import.meta.env.DEV) {
              console.warn(`🛑 Blocked mutation ${tag} #${totalBlocked}`);
            }
            element.remove();

            if (EMERGENCY_MODE) {
              throw new Error(`EMERGENCY IFRAME KILLER: ${tag} injection via mutation forbidden`);
            }
          }

          // Check nested iframes
          const nestedIframes = element.querySelectorAll('iframe, frame, object, embed');
          nestedIframes.forEach((nested, index) => {
            totalBlocked++;
            if (import.meta.env.DEV) {
              console.warn(`🛑 Blocked nested ${nested.tagName} #${totalBlocked}`);
            }
            nested.remove();
          });
        }
      });

      // Check attribute changes that might enable iframes
      if (mutation.type === 'attributes') {
        const target = mutation.target as Element;
        if (target.tagName && ['iframe', 'frame', 'object', 'embed'].includes(target.tagName.toLowerCase())) {
          totalBlocked++;
          if (import.meta.env.DEV) {
            console.warn(`🛑 Blocked attribute change on ${target.tagName} #${totalBlocked}`);
          }
          target.remove();
        }
      }
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'data', 'srcdoc']
  });

  if (import.meta.env.DEV) {
    console.log('🛑 Nuclear mutation observer active');
  }
  return observer;
};

/**
 * EMERGENCY: Block window message events
 */
export const blockAllWindowMessages = () => {
  const originalAddEventListener = window.addEventListener;
  const originalPostMessage = window.postMessage;

  // Block postMessage
  window.postMessage = function(message: any, targetOrigin: string) {
    totalBlocked++;
    if (import.meta.env.DEV) {
      console.warn(`🛑 Blocked postMessage #${totalBlocked} - origin: ${targetOrigin}`);
    }

    if (EMERGENCY_MODE) {
      throw new Error('EMERGENCY IFRAME KILLER: postMessage communication forbidden');
    }
  };

  // Block message event listeners
  window.addEventListener = function(type: string, listener: any, options?: any) {
    if (type === 'message') {
      totalBlocked++;
      if (import.meta.env.DEV) {
        console.warn(`🛑 Blocked message event listener #${totalBlocked}`);
      }

      if (EMERGENCY_MODE) {
        throw new Error('EMERGENCY IFRAME KILLER: message event listeners forbidden');
      }
      return;
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  if (import.meta.env.DEV) {
    console.log('🛑 Window messaging blocking active');
  }
};

/**
 * EMERGENCY: Initialize the nuclear iframe killer
 */
export const initEmergencyIframeKiller = () => {
  if (import.meta.env.DEV) {
    console.warn('🛑 Emergency iframe killer activated');
  }

  killAllExistingIframes();
  overrideAllIframeMethods();
  startNuclearMutationObserver();
  blockAllWindowMessages();

  // Periodic iframe cleanup
  setInterval(() => {
    killAllExistingIframes();
  }, 100); // Check every 100ms

  if (import.meta.env.DEV) {
    console.log(`🛑 Emergency systems active - ${totalBlocked} blocked`);
  }
};

/**
 * Get emergency statistics
 */
export const getEmergencyStats = () => {
  return {
    totalBlocked,
    emergencyMode: EMERGENCY_MODE,
    timestamp: new Date().toISOString()
  };
};

// Auto-initialize in emergency mode
if (typeof window !== 'undefined' && EMERGENCY_MODE) {
  initEmergencyIframeKiller();
}