document.addEventListener('DOMContentLoaded', () => {
    const resources = [
        {
            id: 1,
            title: 'Exercices de vocabulaire',
            description: 'Pratiquez les 1000 mots les plus courants.',
            url: '#',
            icon: 'fas fa-file-word',
            category: '1000-mots',
            type: 'recent'
        },
        {
            id: 2,
            title: 'Leçon de grammaire',
            description: 'Apprenez les bases de la grammaire anglaise.',
            url: '#',
            icon: 'fas fa-language',
            category: 'anglais',
            type: 'recent'
        }
    ];

    const quickAccessGrid = document.getElementById('quick-access-grid');
    const recentlyAddedGrid = document.getElementById('recently-added-grid');
    const favoritesGrid = document.getElementById('favorites-grid');
    const searchBar = document.getElementById('search-bar');
    const categoryLinks = document.querySelectorAll('aside nav a[data-category]');
    const dashboardLink = document.getElementById('dashboard-link');
    const favoritesLink = document.getElementById('favorites-link');
    const mainContent = document.getElementById('main-content');
    const favoritesContent = document.getElementById('favorites-content');
    let currentCategory = 'all';
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    function createResourceCard(resource) {
        const cardWrapper = document.createElement('div');
        cardWrapper.classList.add('card-wrapper', 'relative');

        const card = document.createElement('a');
        card.href = resource.url;
        card.target = "_blank";
        card.classList.add('card');
        card.dataset.category = resource.category;

        const iconClass = resource.category.toLowerCase() + '-icon';

        card.innerHTML = `
            <div class="card-icon ${iconClass}">
                <i class="${resource.icon}"></i>
            </div>
            <div>
                <h4 class="card-title">${resource.title}</h4>
                <p class="card-description">${resource.description}</p>
                <span class="card-link">Voir la Ressource &rarr;</span>
            </div>
        `;

        const favoriteIcon = document.createElement('i');
        favoriteIcon.classList.add('fas', 'fa-star', 'absolute', 'top-4', 'right-4', 'cursor-pointer', 'text-gray-500');
        if (favorites.includes(resource.id)) {
            favoriteIcon.classList.add('text-yellow-400');
        }

        favoriteIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(resource.id);
            favoriteIcon.classList.toggle('text-yellow-400');
        });

        cardWrapper.appendChild(card);
        cardWrapper.appendChild(favoriteIcon);
        return cardWrapper;
    }

    function toggleFavorite(id) {
        const index = favorites.indexOf(id);
        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push(id);
        }
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }

    function displayResources(searchTerm = '', categoryFilter = 'all') {
        quickAccessGrid.innerHTML = '';
        recentlyAddedGrid.innerHTML = '';
        mainContent.classList.remove('hidden');
        favoritesContent.classList.add('hidden');

        const filteredResources = resources.filter(resource => {
            const matchesCategory = categoryFilter === 'all' || resource.category === categoryFilter;
            const matchesSearch = searchTerm === '' || resource.title.toLowerCase().includes(searchTerm) || resource.description.toLowerCase().includes(searchTerm);
            return matchesCategory && matchesSearch;
        });

        filteredResources.forEach(resource => {
            const card = createResourceCard(resource);
            if (resource.type === 'quick') {
                quickAccessGrid.appendChild(card);
            } else if (resource.type === 'recent') {
                recentlyAddedGrid.appendChild(card);
            }
        });
    }

    function displayFavorites() {
        favoritesGrid.innerHTML = '';
        mainContent.classList.add('hidden');
        favoritesContent.classList.remove('hidden');

        const favoriteResources = resources.filter(resource => favorites.includes(resource.id));

        favoriteResources.forEach(resource => {
            const card = createResourceCard(resource);
            favoritesGrid.appendChild(card);
        });
    }

    searchBar.addEventListener('input', () => {
        const searchTerm = searchBar.value.toLowerCase();
        displayResources(searchTerm, currentCategory);
    });

    categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            currentCategory = link.dataset.category;

            categoryLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            const searchTerm = searchBar.value.toLowerCase();
            displayResources(searchTerm, currentCategory);
        });
    });

    dashboardLink.addEventListener('click', (e) => {
        e.preventDefault();
        currentCategory = 'all';
        searchBar.value = '';
        categoryLinks.forEach(l => l.classList.remove('active'));
        displayResources();
    });

    favoritesLink.addEventListener('click', (e) => {
        e.preventDefault();
        displayFavorites();
    });

    displayResources();
});
