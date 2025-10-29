document.addEventListener('DOMContentLoaded', () => {
    const uploadSection = document.getElementById('upload-form')?.parentElement;
    const addResourceSection = document.getElementById('add-resource-form')?.parentElement;
    const addCategorySection = document.getElementById('add-category-form')?.parentElement;
    const sidebarNavUl = document.querySelector('aside nav ul');

    if (uploadSection) uploadSection.style.display = 'none';
    if (addResourceSection) addResourceSection.style.display = 'none';
    if (addCategorySection) addCategorySection.style.display = 'none';

    fetch('/api/categories')
        .then(response => {
            if (!response.ok) throw new Error('Server not available');
            return response.json();
        })
        .then(categories => {
            if (uploadSection) uploadSection.style.display = 'block';
            if (addResourceSection) addResourceSection.style.display = 'block';
            if (addCategorySection) addCategorySection.style.display = 'block';

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

            const resourceCategorySelect = document.getElementById('resource-category');
            if (resourceCategorySelect) {
                resourceCategorySelect.innerHTML = '';
                categories.filter(c => c.id !== 'pdfs').forEach(category => {
                    const option = document.createElement('option');
                    option.value = category.id;
                    option.textContent = category.name;
                    resourceCategorySelect.appendChild(option);

        })
        .catch(error => {
            console.log("Server not detected. Hiding server-dependent UI elements.");
        });

    fetch('resources.json')
        .then(response => response.json())
        .then(resources => {
            const quickAccessGrid = document.getElementById('quick-access-grid');
            const recentlyAddedGrid = document.getElementById('recently-added-grid');
            const favoritesGrid = document.getElementById('favorites-grid');
            const searchBar = document.getElementById('search-bar');
            const categoryLinks = document.querySelectorAll('aside nav a[data-category]');
            const dashboardLink = document.getElementById('dashboard-link');
            const favoritesLink = document.getElementById('favorites-link');
            const mainContent = document.getElementById('main-content');
            const favoritesContent = document.getElementById('favorites-content');
            const pdfsContent = document.getElementById('pdfs-content');
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
                if (pdfsContent) {
                    pdfsContent.classList.add('hidden');
                }

                const filteredResources = resources.filter(resource => {
                    const matchesSearch = searchTerm === '' || resource.title.toLowerCase().includes(searchTerm) || resource.description.toLowerCase().includes(searchTerm);
                    if (!matchesSearch) {
                        return false;
                    }

                    if (categoryFilter === 'all') {
                        return resource.category !== 'pdfs';
                    } else {
                        return resource.category === categoryFilter;
                    }
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
                if (pdfsContent) {
                    pdfsContent.classList.add('hidden');
                }

                const favoriteResources = resources.filter(resource => favorites.includes(resource.id));

                favoriteResources.forEach(resource => {
                    const card = createResourceCard(resource);
                    favoritesGrid.appendChild(card);
                });
            }

            function createPdfCard(resource) {
                const card = document.createElement('div');
                card.classList.add('bg-gray-800', 'p-4', 'rounded-lg', 'flex', 'items-center', 'justify-between');
                card.innerHTML = `
                    <div>
                        <h4 class="text-lg font-bold text-white">${resource.title}</h4>
                        <a href="${resource.url}" download class="text-blue-400 hover:text-blue-500">Télécharger</a>
                    </div>
                    <i class="fas fa-file-pdf text-red-500 text-2xl"></i>
                `;
                return card;
            }

            function displayPdfs() {
                mainContent.classList.add('hidden');
                favoritesContent.classList.add('hidden');
                if (pdfsContent) {
                    pdfsContent.classList.remove('hidden');
                }

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

            searchBar.addEventListener('input', () => {
                const searchTerm = searchBar.value.toLowerCase();
                displayResources(searchTerm, currentCategory);
            });

            const sidebarNav = document.querySelector('aside nav');
            sidebarNav.addEventListener('click', e => {
                const link = e.target.closest('a[data-category]');
                if (!link) return;

                e.preventDefault();
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
                categoryLinks.forEach(l => l.classList.remove('active'));
                displayResources();
            });

            favoritesLink.addEventListener('click', (e) => {
                e.preventDefault();
                displayFavorites();
            });

            const uploadForm = document.getElementById('upload-form');
            if (uploadForm) {
                uploadForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const fileInput = document.getElementById('pdf-file');
                    const file = fileInput.files[0];
                    if (file) {
                        const formData = new FormData();
                        formData.append('pdf-file', file);

                        fetch('/upload', {
                            method: 'POST',
                            body: formData
                        })
                        .then(response => response.text())
                        .then(result => {
                            console.log(result);
                            location.reload();
                        })
                        .catch(error => {
                            console.error('Error:', error);
                        });
                    }
                });
            }
            const addResourceForm = document.getElementById('add-resource-form');
            const resourceCategorySelect = document.getElementById('resource-category');

            if (addResourceForm && resourceCategorySelect) {
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
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(newResource),
                    })
                    .then(response => {
                        if (response.ok) {
                            location.reload();
                        } else {
                            alert('Erreur lors de l\'ajout de la ressource.');
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('Erreur de connexion au serveur.');
                    });
                });
            }

            displayResources();
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
                        if (response.ok) {
                            location.reload();
                        } else {
                            alert('Erreur lors de la création de la catégorie.');
                        }
                    })
                    .catch(error => {
                        console.error('Error adding category:', error);
                        alert('Erreur de connexion au serveur.');
                    });
                });
            }
        });
});
