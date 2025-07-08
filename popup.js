document.addEventListener('DOMContentLoaded', () => {
  const siteListDiv = document.getElementById('siteList');

  console.log('Popup: Requesting site list from background script...');
  // Request site list from background script
  chrome.runtime.sendMessage({ action: 'getSiteList' }, (response) => {
    console.log('Popup: Received response from background:', response);
    if (response && response.siteList) {
      
      console.log('Popup: Processing site list:', response.siteList);
      response.siteList.filter(site => site.hostname !== 'shopee.tw').forEach(site => {
        
        const div = document.createElement('div');
        div.className = 'site-item';
        let extraInputHtml = '';
        if (site.hostname === 'momoshop.com.tw') {
          
          extraInputHtml = `
            <input type="text" id="momoMemId" placeholder="點點賺id" style="margin-left: 10px; padding: 5px; border: 1px solid #ccc; border-radius: 4px; width: 120px;">
          `;
        }
        div.innerHTML = `
          <label>
            <input type="checkbox" id="${site.hostname}" data-hostname="${site.hostname}">
            ${site.name}
          </label>
          ${extraInputHtml}
        `;
        siteListDiv.appendChild(div);

        const checkbox = document.getElementById(site.hostname);
        // Load saved state
        chrome.storage.sync.get([site.hostname, 'momoMemId'], (result) => {
          checkbox.checked = result[site.hostname] !== false; // Default to true if not set
          if (site.hostname === 'momoshop.com.tw') {
            const momoMemIdInput = div.querySelector('#momoMemId');
            if (result.momoMemId) {
              momoMemIdInput.value = result.momoMemId;
            } else {
              momoMemIdInput.value = ''; // Keep it empty to show placeholder
            }
            momoMemIdInput.addEventListener('input', (event) => {
              chrome.storage.sync.set({ momoMemId: event.target.value });
            });
          }
        });

        // Save state on change
        checkbox.addEventListener('change', (event) => {
          chrome.storage.sync.set({ [site.hostname]: event.target.checked });
        });
      });
    } else {
      console.log('Popup: No site list received or response is invalid.');
    }
  });

  const closeAllTabsButton = document.getElementById('closeAllTabs');
  if (closeAllTabsButton) {
    closeAllTabsButton.addEventListener('click', () => {
      console.log('Popup: Close All Tabs button clicked.');
      chrome.runtime.sendMessage({ action: 'closeAllOpenedTabs' });
    });
  }

  const showHelpButton = document.getElementById('showHelp');
  if (showHelpButton) {
    showHelpButton.addEventListener('click', () => {
      console.log('Popup: Show Help button clicked.');
      const helpContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>比吧 使用說明</title>
          <style>
            body { font-family: sans-serif; padding: 20px; line-height: 1.6; color: #333; max-width: 600px; margin: auto; }
            h1 { color: #2c3e50; font-size: 24px; margin-bottom: 15px; }
            h2 { color: #34495e; font-size: 18px; margin-top: 25px; margin-bottom: 10px; }
            p { margin-bottom: 10px; }
            ul { margin-bottom: 10px; padding-left: 20px; }
            li { margin-bottom: 5px; }
            .highlight { color: #e74c3c; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>比吧 使用說明</h1>
          <p>「比吧」能幫您更快找到有沒有比蝦皮賣的更便宜的電商，當您瀏覽蝦皮的商品頁或搜尋結果頁時能自動為您開啟其它電商網站的搜尋結果頁，讓您輕鬆比！</p>
		      <p>為什麼不用 google 購物或比價網站呢? 因為它們都不是及時及新各大電商的商品價格和庫存，只有直接連去電商的網站才能獲得最新的商品資訊！</p>

          <h2>主要功能</h2>
          <ul>
            <li><span class="highlight">自訂比價網站</span>：您可以透過設定，自由選擇要在哪些電商網站啟用比價功能。</li>
            <li><span class="highlight">一鍵關閉分頁</span>：設定提供按鈕，讓您輕鬆關閉所有由「比吧」開啟的分頁。</li>
          </ul>

          <h2>如何使用</h2>
          <ol>
            <li><span class="highlight">安裝擴充功能</span>：將「比吧」載入到您的 Chrome 瀏覽器中。</li>
            <li><span class="highlight">設定偏好</span>：點擊瀏覽器工具列上的「比吧」圖示，進入設定頁面。您可以勾選或取消勾選電商網站，決定是否啟用該網站的比價功能。</li>
            <li><span class="highlight">管理分頁</span>：當您完成比價後，可以再次點擊「比吧」圖示，然後點擊「關閉所有比價分頁」按鈕，快速關閉所有開啟的分頁。</li>
          </ol>

          <h2>注意事項</h2>
          <ul>
            <li>「比吧」只會在您瀏覽蝦皮的<span class="highlight">商品頁</span>或<span class="highlight">搜尋結果頁</span>時觸發。</li>
            <li>momo購物網常常會有<span class="highlight">折價劵</span>可以使用，所以看到的價格有可能會比其它的購物網站高，但是一旦套用折價劵以後可能是相對便宜的。</li>
            <li>momo購物網的「點點賺id」為選填，若您有自己的ID，可在此輸入。</li>
          </ul>

          <p>感謝您的使用！</p>
        </body>
        </html>
      `;
      const helpUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(helpContent);
      chrome.tabs.create({ url: helpUrl });
    });
  }
});
