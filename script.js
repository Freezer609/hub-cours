/**
 * @file Point d'entrée principal de la logique client pour le Hub.
 * Gère le chargement des données, l'initialisation de l'état de l'application et l'enregistrement des écouteurs d'événements.
 */

document.addEventListener('DOMContentLoaded', () => {
    /**
     * Stratégie d'initialisation :
     * 1. Tente de fetch les catégories depuis l'endpoint de l'API. Le succès/échec de cette promesse détermine le statut du serveur.
     * 2. En parallèle, fetch les données statiques (catégories locales, ressources) depuis les fichiers JSON.
     * 3. Promise.all est utilisé pour attendre la résolution de toutes les promesses initiales.
     * 4. Une fois les données disponibles, la fonction initializePage() est appelée pour hydrater le DOM.
     * 5. En cas d'échec de l'API, un fallback sur les données locales est effectué pour assurer le fonctionnement en mode client-side pur.
     */
    const categoriesPromise = fetch('categories.json').then(res => res.json());
    const resourcesPromise = fetch('resources.json').then(res => res.json());
    const serverStatusPromise = fetch('/api/categories').then(res => res.ok).catch(() => false);

    Promise.all([categoriesPromise, resourcesPromise, serverStatusPromise])
        .then(([categories, resources, isServerUp]) => {
            initializePage(categories, resources, isServerUp);
        })
        .catch(error => {
            console.error("Fatal Error: Could not load local data files (resources.json or categories.json).", error);
            document.body.innerHTML = "<h1>Erreur critique: Impossible de charger les données du site.</h1>";
        });
});

/**
 * Fonction principale d'hydratation et d'initialisation de l'application.
 * Responsable du rendu conditionnel de l'UI, de la construction du DOM dynamique et de l'enregistrement des écouteurs d'événements.
 * @param {object[]} categories - Données des catégories.
 * @param {object[]} resources - Données des ressources.
 * @param {boolean} isServerUp - Flag indiquant si l'API serveur est accessible.
 */
function initializePage(categories, resources, isServerUp) {
    // Mise en cache des sélecteurs DOM pour la performance.
    const uploadSection = document.getElementById('upload-form')?.parentElement;
    const addResourceSection = document.getElementById('add-resource-form')?.parentElement;
    const addCategorySection = document.getElementById('add-category-form')?.parentElement;
    const sidebarNavUl = document.querySelector('aside nav ul');
    const resourceCategorySelect = document.getElementById('resource-category');

    // Injection dynamique des catégories dans la sidebar et les dropdowns.
    // Cette opération est découplée du statut du serveur et ne dépend que de la disponibilité des données locales.
    if (categories && categories.length > 0) {
        const categoryLinksHtml = categories.map(category => `
            <li class="mb-4">
                <a href="#" data-category="${category.id}" class="flex items-center text-gray-300 hover:text-white">
                    <img src="${category.image}" alt="${category.name} Icon" class="h-5 w-5 mr-3">
                    ${category.name}
                </a>
            </li>
        `).join('');
        if (sidebarNavUl) {
            sidebarNavUl.innerHTML += categoryLinksHtml;
        }
        if (resourceCategorySelect) {
            resourceCategorySelect.innerHTML = '';
            categories.filter(c => c.id !== 'pdfs').forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                resourceCategorySelect.appendChild(option);
            });
        }
    }

    // Rendu conditionnel des composants UI qui dépendent du serveur.
    if (isServerUp) {
        if (uploadSection) uploadSection.style.display = 'block';
        if (addResourceSection) addResourceSection.style.display = 'block';
        if (addCategorySection) addCategorySection.style.display = 'block';
    } else {
        if (uploadSection) uploadSection.style.display = 'none';
        if (addResourceSection) addResourceSection.style.display = 'none';
        if (addCategorySection) addCategorySection.style.display = 'none';
    }

    // Initialisation de l'état de l'application et des variables locales.
    const quickAccessGrid = document.getElementById('quick-access-grid');
    const recentlyAddedGrid = document.getElementById('recently-added-grid');
    const favoritesGrid = document.getElementById('favorites-grid');
    const searchBar = document.getElementById('search-bar');
    const dashboardLink = document.getElementById('dashboard-link');
    const favoritesLink = document.getElementById('favorites-link');
    const mainContent = document.getElementById('main-content');
    const favoritesContent = document.getElementById('favorites-content');
    const pdfsContent = document.getElementById('pdfs-content');
    
    let currentCategory = 'all'; // État du filtre de catégorie actuel.
    let favorites = JSON.parse(localStorage.getItem('favorites')) || []; // Persistance des favoris via le localStorage.

    /**
     * Construit un élément de carte de ressource.
     * @param {object} resource - L'objet ressource.
     * @returns {HTMLElement} L'élément DOM de la carte.
     */
    function createResourceCard(resource) {
        const cardWrapper = document.createElement('div');
        cardWrapper.classList.add('card-wrapper', 'relative');
        const card = document.createElement('a');
        card.href = resource.url;
        card.target = "_blank";
        card.classList.add('card');
        card.dataset.category = resource.category;
        const iconClass = resource.category.toLowerCase() + '-icon';
        card.innerHTML = "`
            <div class=\"card-icon ${iconClass}\">
                <i class=\"" + resource.icon + "\"></i>
            </div>
            <div>
                <h4 class=\"card-title\">${resource.title}</h4>
                <p class=\"card-description\">${resource.description}</p>
                <span class=\"card-link\">Voir la Ressource &rarr;</span>
            </div>
        `";
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

    /**
     * Gère l'état des favoris (ajout/suppression).
     * @param {number} id - L'ID de la ressource.
     */
    function toggleFavorite(id) {
        const index = favorites.indexOf(id);
        if (index > -1) {
            favorites.splice(index, 1);
        } else {
            favorites.push(id);
        }
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }

    /**
     * Filtre et affiche les ressources dans le DOM.
     * @param {string} [searchTerm=''] - Terme de recherche optionnel.
     * @param {string} [categoryFilter='all'] - Filtre de catégorie optionnel.
     */
    function displayResources(searchTerm = '', categoryFilter = 'all') {
        quickAccessGrid.innerHTML = '';
        recentlyAddedGrid.innerHTML = '';
        mainContent.classList.remove('hidden');
        favoritesContent.classList.add('hidden');
        if (pdfsContent) pdfsContent.classList.add('hidden');

        const filteredResources = resources.filter(resource => {
            const matchesSearch = searchTerm === '' || resource.title.toLowerCase().includes(searchTerm) || resource.description.toLowerCase().includes(searchTerm);
            if (!matchesSearch) return false;
            if (categoryFilter === 'all') return resource.category !== 'pdfs';
            return resource.category === categoryFilter;
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

    /** Gère l'affichage de la vue "Favoris". */
    function displayFavorites() {
        favoritesGrid.innerHTML = '';
        mainContent.classList.add('hidden');
        favoritesContent.classList.remove('hidden');
        if (pdfsContent) pdfsContent.classList.add('hidden');
        const favoriteResources = resources.filter(resource => favorites.includes(resource.id));
        favoriteResources.forEach(resource => {
            const card = createResourceCard(resource);
            favoritesGrid.appendChild(card);
        });
    }

    /** Construit une carte pour un item PDF. */
    function createPdfCard(resource) {
        const card = document.createElement('div');
        card.classList.add('bg-gray-800', 'p-4', 'rounded-lg', 'flex', 'items-center', 'justify-between');
        card.innerHTML = "`
            <div>
                <h4 class=\"text-lg font-bold text-white\">${resource.title}</h4>
                <a href=\"${resource.url}\" download class=\"text-blue-400 hover:text-blue-500\">Télécharger</a>
            </div>
            <i class=\"fas fa-file-pdf text-red-500 text-2xl\"></i>
        `";
        return card;
    }

    /** Gère l'affichage de la vue "PDFs". */
    function displayPdfs() {
        mainContent.classList.add('hidden');
        favoritesContent.classList.add('hidden');
        if (pdfsContent) pdfsContent.classList.remove('hidden');
        const pdfsGrid = document.getElementById('pdfs-grid');
        if (pdfsGrid) {
            pdfsGrid.innerHTML = '';
            const pdfResources = resources.filter(resource => resource.category === 'pdfs');
            pdfResources.forEach(resource => {
                const card = createPdfCard(resource);
                pdfsGrid.appendChild(card);
            });
        }
    }

    // --- Enregistrement des écouteurs d'événements ---

    searchBar.addEventListener('input', () => {
        const searchTerm = searchBar.value.toLowerCase();
        displayResources(searchTerm, currentCategory);
    });

    // Utilisation de la délégation d'événement sur la navigation pour gérer les clics sur les liens dynamiques.
    const sidebarNav = document.querySelector('aside nav');
    sidebarNav.addEventListener('click', e => {
        const link = e.target.closest('a[data-category]');
        if (!link) return;
        e.preventDefault();

        if (sidebar.classList.contains('sidebar-open')) {
            sidebar.classList.remove('sidebar-open');
        }

        currentCategory = link.dataset.category;
        const allCategoryLinks = sidebarNav.querySelectorAll('a[data-category]');
        allCategoryLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        if (currentCategory === 'pdfs') {
            displayPdfs();
        } else {
            const searchTerm = searchBar.value.toLowerCase();
            displayResources(searchTerm, currentCategory);
        }
    });

    dashboardLink.addEventListener('click', (e) => {
        e.preventDefault();
        currentCategory = 'all';
        searchBar.value = '';
        const allCategoryLinks = document.querySelectorAll('aside nav a[data-category]');
        allCategoryLinks.forEach(l => l.classList.remove('active'));
        displayResources();
    });

    favoritesLink.addEventListener('click', (e) => {
        e.preventDefault();
        displayFavorites();
    });

    // Gestionnaires de soumission pour les formulaires.
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const fileInput = document.getElementById('pdf-file');
            const file = fileInput.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('pdf-file', file);
                fetch('/upload', { method: 'POST', body: formData })
                    .then(response => response.text())
                    .then(result => {
                        console.log(result);
                        location.reload();
                    })
                    .catch(error => console.error('Error:', error));
            }
        });
    }

    const addResourceForm = document.getElementById('add-resource-form');
    if (addResourceForm) {
        addResourceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newResource = {
                title: document.getElementById('resource-title').value,
                url: document.getElementById('resource-url').value,
                description: document.getElementById('resource-description').value,
                category: resourceCategorySelect.value
            };
            fetch('/add-resource', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(newResource) 
            })
            .then(response => {
                if (response.ok) location.reload();
                else alert('Erreur lors de l\'ajout de la ressource.');
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Erreur de connexion au serveur.');
            });
        });
    }

    const addCategoryForm = document.getElementById('add-category-form');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', e => {
            e.preventDefault();
            const categoryName = document.getElementById('category-name').value;
            const categoryImage = document.getElementById('category-image').value;
            if (!categoryName || !categoryImage) {
                alert('Veuillez remplir tous les champs.');
                return;
            }
            fetch('/api/categories', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ name: categoryName, image: categoryImage }) 
            })
            .then(response => {
                if (response.ok) location.reload();
                else alert('Erreur lors de la création de la catégorie.');
            })
            .catch(error => {
                console.error('Error adding category:', error);
                alert('Erreur de connexion au serveur.');
            });
        });
    }

    // --- Logique pour le menu Hamburger sur mobile ---
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('aside');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('sidebar-open');
        });
    }

    // Appel initial pour afficher les ressources par défaut.
    displayResources();
}