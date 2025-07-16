
console.log('Content script: Initializing...', window.location.href);

let lastProcessedUrl = window.location.href;

// Function to get the title from meta tags or document title
function getTitle() {
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle && ogTitle.content) {
    console.log('Content: Found og:title:', ogTitle.content);
    return ogTitle.content;
  }
  console.log('Content: Using document.title:', document.title);
  return document.title;
}

// Function to get the keyword, with special handling for Shopee and Books.com.tw URLs
function getKeywordForSite(site, url) {
    if (site.name === '蝦皮購物') {
        // For Shopee search pages, extract keyword from the URL parameters
        if (site.urlPatterns.search && url.includes(site.urlPatterns.search)) {
            try {
                const urlObj = new URL(url);
                const keyword = urlObj.searchParams.get('keyword');
                if (keyword) {
                    console.log('Content: Extracted keyword from Shopee search URL:', keyword);
                    return decodeURIComponent(keyword);
                }
            } catch (e) {
                console.error('Content: Could not parse URL for Shopee keyword', e);
            }
        }
        // For Shopee product pages, extract the name from the URL path
        else if (site.urlPatterns.product && url.includes(site.urlPatterns.product)) {
            try {
                const path = new URL(url).pathname;
                // The product name is the part of the path after the initial '/' and before the '-i.'
                const productName = path.substring(1, path.lastIndexOf('-i.'));
                if (productName) {
                    // Replace dashes with spaces for a cleaner keyword
                    const cleanedName = decodeURIComponent(productName.replace(/-/g, ' '));
                    console.log('Content: Extracted product name from Shopee product URL:', cleanedName);
                    return cleanedName;
                }
            } catch(e) {
                console.error('Content: Could not parse URL for Shopee product name', e);
            }
        }
    } else if (site.name === '博客來') {
        // For Books.com.tw search pages, extract keyword from the URL path
        if (site.urlPatterns.search && url.includes(site.urlPatterns.search)) {
            try {
                const path = new URL(url).pathname;
                // The keyword is the part of the path after '/search/query/key/'
                const keyword = path.substring(path.lastIndexOf('/key/') + 5, path.lastIndexOf('/cat/'));
                if (keyword) {
                    console.log('Content: Extracted keyword from Books.com.tw search URL:', keyword);
                    return decodeURIComponent(keyword);
                }
            } catch (e) {
                console.error('Content: Could not parse URL for Books.com.tw keyword', e);
            }
        }
    } else if (site.name === '東森購物') {
        // For ET Mall search pages, extract keyword from the URL parameters
        if (site.urlPatterns.search && url.includes(site.urlPatterns.search)) {
            try {
                const urlObj = new URL(url);
                const keyword = urlObj.searchParams.get('keyword');
                if (keyword) {
                    console.log('Content: Extracted keyword from ET Mall search URL:', keyword);
                    return decodeURIComponent(keyword);
                }
            } catch (e) {
                console.error('Content: Could not parse URL for ET Mall keyword', e);
            }
        }
    }
    // Fallback for all other pages to use the title
    return getTitle();
}

// Function to determine if the current page is a product or search page
function isProductOrSearchPage(site, currentUrl) {
  console.log('Content: Checking if page is product or search page...');
  // 1. Prioritize URL patterns if defined
  if (site.urlPatterns) {
    if (site.urlPatterns.search && currentUrl.includes(site.urlPatterns.search)) {
      console.log('Content: Page identified as search page by URL pattern.');
      return true;
    }
    if (site.urlPatterns.product && currentUrl.includes(site.urlPatterns.product)) {
      console.log('Content: Page identified as product page by URL pattern.');
      return true;
    }
  }

  // 2. Fallback to DOM element checks if URL patterns don't match or are not defined
  const productElementExists = document.querySelector(site.selectors.product);
  const titleElementExists = document.querySelector(site.selectors.title);

  console.log('Content: Checking DOM elements. Product selector exists:', !!productElementExists, ', Title selector exists:', !!titleElementExists);

  if (productElementExists) {
    console.log('Content: Page identified by product selector.');
    return true;
  }
  if (titleElementExists) {
    console.log('Content: Page identified by title selector.');
    return true;
  }
  return false;
}

// Main logic to be executed on page load and URL changes
function handlePageChange() {
  const currentUrl = window.location.href;
  console.log('Content: handlePageChange triggered for URL:', currentUrl);

  // Check if the page is being pre-rendered
  if (document.prerendering) {
    console.log('Content: Page is pre-rendering. Skipping price comparison.');
    return;
  }

  // Check if it's the Shopee captcha page
  if (currentUrl.includes('shopee.tw/verify/captcha')) {
    console.log('Content: Current page is Shopee captcha page. Skipping price comparison.');
    return;
  }

  const site = Object.values(config.sites).flat().find(s => currentUrl.includes(s.hostname));
  console.log('Content: Site config lookup result:', site);

  if (site && site.name === '蝦皮購物') {
    console.log('Content: Current site is Shopee.');
    const isRelevantPage = isProductOrSearchPage(site, currentUrl);
    console.log('Content: isRelevantPage result:', isRelevantPage);

    if (isRelevantPage) {
      const keyword = getKeywordForSite(site, currentUrl);
      console.log('Content: Extracted keyword:', keyword);
      if (keyword) {
          console.log('Content: Attempting to send message to background.');
          try {
              chrome.runtime.sendMessage({ action: 'startPriceComparison', title: keyword, url: currentUrl });
              console.log('Content: Message sent successfully.');
          } catch (error) {
              console.error('Content: Error sending message to background:', error);
          }
      } else {
          console.log('Content: Keyword is empty, not sending message.');
      }
    } else {
      console.log('Content: Page is not a product or search page. Not sending message.');
    }
  } else {
    console.log('Content: Not on Shopee or no site config found for this hostname.');
  }
}

// Initial execution on page load
handlePageChange();

// Monitor URL changes for SPA navigation
let urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastProcessedUrl) {
    console.log('Content: URL changed detected by MutationObserver.');
    lastProcessedUrl = window.location.href;
    handlePageChange();
  }
});

// Start observing the document body for changes (including URL changes in SPA)
urlObserver.observe(document.body, { childList: true, subtree: true });

// Listen for popstate event (browser back/forward buttons)
window.addEventListener('popstate', () => {
  if (window.location.href !== lastProcessedUrl) {
    console.log('Content: URL changed detected by popstate event.');
    lastProcessedUrl = window.location.href;
    handlePageChange();
  }
});


