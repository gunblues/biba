const config = {
  sites: {
    tw: [
      {
        name: 'momo購物網',
        hostname: 'momoshop.com.tw',
        searchUrl: 'https://www.momoshop.com.tw/search/searchShop.jsp?keyword={keyword}&cateLevel=0&_isFuzzy=1&searchType=1&memid={memid}&cid=apuad&oid=1&osm=league',
        urlPatterns: {
          search: '/search/',
          product: '/goods/'
        },
        selectors: {
          product: 'li.goods',
          title: 'h3.prdName',
          price: 'span.price',
          image: 'img.goodsimg',
          link: 'a.goodsUrl',
        },
      },
      {
        name: '蝦皮購物',
        hostname: 'shopee.tw',
        searchUrl: 'https://shopee.tw/search?keyword={keyword}',
        urlPatterns: {
          search: '/search',
          product: '-i.'
        },
        selectors: {
          product: 'div.shopee-search-item-result__item',
          title: 'div.Cve6sh',
          price: 'div.vioxXd',
          image: 'img',
          link: 'a',
        },
      },
      {
        name: 'PChome 24h購物',
        hostname: 'pchome.com.tw',
        searchUrl: 'https://ecshweb.pchome.com.tw/search/v3.3/?q={keyword}',
        urlPatterns: {
          search: '/search/',
          product: '/prod/'
        },
        selectors: {
          product: 'dl.c-prodList__item',
          title: 'h5.c-prodList__name',
          price: 'span.c-prodList__price',
          image: 'img.c-prodList__img',
          link: 'a.c-prodList__link',
        },
      },
      {
        name: 'Yahoo奇摩購物中心',
        hostname: 'tw.buy.yahoo.com',
        searchUrl: 'https://tw.buy.yahoo.com/search/product?p={keyword}',
        urlPatterns: {
          search: '/search/',
          product: '/gdsale/'
        },
        selectors: {
          product: 'li.ResultList_item_1p2iF',
          title: 'div.ResultList_title_30_5S',
          price: 'div.ResultList_price_3itG3',
          image: 'img',
          link: 'a',
        },
      },
      {
        name: '樂天市場',
        hostname: 'rakuten.com.tw',
        searchUrl: 'https://www.rakuten.com.tw/search/{keyword}/',
        urlPatterns: {
          search: '/search/',
          product: '/product/'
        },
        selectors: {
          product: 'div.b-item',
          title: 'h2.b-item__name a',
          price: 'span.b-item__price',
          image: 'img.b-item__img',
          link: 'h2.b-item__name a',
        },
      },
      {
        name: '博客來',
        hostname: 'books.com.tw',
        searchUrl: 'https://search.books.com.tw/search/query/key/{keyword}/cat/all',
        urlPatterns: {
          search: '/search/',
          product: '/products/'
        },
        selectors: {
          product: '.item',
          title: 'h4 a',
          price: '.sale_price',
          image: 'img',
          link: 'h4 a',
        },
      },
      {
        name: '東森購物',
        hostname: 'etmall.com.tw',
        searchUrl: 'https://www.etmall.com.tw/Search?keyword={keyword}',
        urlPatterns: {
          search: '/Search',
          product: '/i/'
        },
        selectors: {
          product: '.n-gds-card',
          title: '.n-gds-card__name',
          price: '.n-gds-card__price',
          image: 'img',
          link: 'a',
        },
      }
    ]
  }
};