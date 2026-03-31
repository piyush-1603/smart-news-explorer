fetch('https://newsapi.org/v2/everything?q=apple&from=2026-03-30&to=2026-03-30&sortBy=popularity&apiKey=bbd970058f554533be8423ab7236550b')
    .then(response => response.json())
    .then(data => {
        console.log(data);
        const articles = data.articles;
        const newsContainer = document.createElement('div');
        newsContainer.classList.add('news-container');

        articles.forEach(article => {
            const newsItem = document.createElement('div');
            newsItem.classList.add('news-item');

            const title = document.createElement('h2');
            title.textContent = article.title;

            const description = document.createElement('p');
            description.textContent = article.description;

            newsItem.appendChild(title);
            newsItem.appendChild(description);
            newsContainer.appendChild(newsItem);
        });

        document.body.appendChild(newsContainer);
    })
    .catch(error => console.error('Error fetching news:', error));              