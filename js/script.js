/**
 * ESTADO GLOBAL DE LA APLICACIÓN
 * Estas variables mantienen el estado de la aplicación durante la sesión del usuario
 */
let currentUser = null;  // Usuario actual logueado
let products = [];       // Lista de productos cargados
let aisles = new Set();  // Conjunto de pasillos disponibles (sin duplicados)
let isAdmin = false;     // Indica si el usuario actual tiene privilegios de administrador

/**
 * FUNCIONES DE AUTENTICACIÓN
 * Manejo de inicio y cierre de sesión de usuarios
 */
function login() {
    const username = document.getElementById('username').value.trim();
    if (username) {
        // Verificar si el usuario es admin o está registrado
        if (username.toLowerCase() === 'admin' || isUserRegistered(username)) {
            currentUser = username;
            isAdmin = username.toLowerCase() === 'admin';
            localStorage.setItem('currentUser', username);
            localStorage.setItem('isAdmin', isAdmin);
            document.getElementById('user-name').textContent = username;
            document.getElementById('auth-container').classList.add('hidden');
            document.getElementById('main-container').classList.remove('hidden');
            loadUserList();
            updateAdminControls();
        } else {
            alert('Usuario no registrado. Por favor, contacte con el administrador.');
        }
    }
}

function updateAdminControls() {
    // Hide all admin-only elements for non-admin users
    const adminElements = [
        document.getElementById('admin-manage-products'),
        document.getElementById('admin-manage-users'),
        document.querySelector('.file-upload'),
        document.querySelector('button[onclick="showAddItemForm()"]'),
        document.getElementById('product-management'),
        document.getElementById('add-item-form')
    ];

    adminElements.forEach(element => {
        if (element) {
            element.style.display = isAdmin ? 'block' : 'none';
        }
    });

    // Ensure product management and add item forms are hidden for non-admin users
    if (!isAdmin) {
        document.getElementById('product-management').classList.add('hidden');
        document.getElementById('add-item-form').classList.add('hidden');
        document.getElementById('user-management').classList.add('hidden');
    }
}

function logout() {
    // Reset user state
    currentUser = null;
    isAdmin = false;
    products = [];
    aisles = new Set();

    // Clear local storage
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('products');
    localStorage.removeItem('userList');

    // Reset UI elements
    document.getElementById('auth-container').classList.remove('hidden');
    document.getElementById('main-container').classList.add('hidden');
    document.getElementById('username').value = '';
    document.getElementById('product-management').classList.add('hidden');
    document.getElementById('add-item-form').classList.add('hidden');

    // Clear any displayed products
    document.getElementById('products-container').innerHTML = '';
}

// Funciones de manejo de archivos Excel
async function loadExcelFile() {
    if (!isAdmin) {
        alert('Solo el administrador puede cargar archivos.');
        return;
    }
    const fileInput = document.getElementById('excel-file');
    const file = fileInput.files[0];
    if (!file) {
        alert('Por favor, seleccione un archivo');
        return;
    }

    const progressContainer = document.getElementById('upload-progress');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    progressContainer.classList.remove('hidden');

    try {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                // Dividir por líneas y luego por punto y coma
                const rows = content.split('\n').map(row => row.split(';'));
                // Filtrar filas vacías o con formato incorrecto
                const jsonData = rows.slice(1)
                    .filter(row => row.length >= 2 && row[1] && row[1].trim() !== '')
                    .map(row => ({
                        // Ajustar el mapeo para que coincida con la estructura del CSV (Pasillo;Artículo)
                        Producto: row[1]?.trim() || '',
                        Pasillo: row[0]?.trim() || 'Sin Pasillo'
                    }));
                
                processExcelData(jsonData);
                progressBar.value = 100;
                progressText.textContent = '100%';
                setTimeout(() => {
                    progressContainer.classList.add('hidden');
                    progressBar.value = 0;
                    progressText.textContent = '0%';
                }, 1000);
            } catch (error) {
                alert('Error al procesar el archivo: ' + error.message);
                progressContainer.classList.add('hidden');
            }
        };

        reader.onprogress = function(e) {
            if (e.lengthComputable) {
                const percentLoaded = Math.round((e.loaded / e.total) * 100);
                progressBar.value = percentLoaded;
                progressText.textContent = percentLoaded + '%';
            }
        };

        reader.onerror = function() {
            alert('Error al leer el archivo');
            progressContainer.classList.add('hidden');
        };

        reader.readAsText(file);
    } catch (error) {
        alert('Error al cargar el archivo: ' + error.message);
        progressContainer.classList.add('hidden');
    }
}

function processExcelData(data) {
    products = data
        .filter(row => row.Producto && row.Producto.trim() !== '') // First filter out rows without a product name
        .map(row => {
            // Clean and validate the aisle name
            let aisle = row.Pasillo && row.Pasillo.trim();
            // If aisle is empty or just contains semicolons, assign default aisle
            if (!aisle || aisle === ';' || aisle === ';;') {
                aisle = 'Sin Pasillo';
            }
            return {
                name: row.Producto.trim(),
                aisle: aisle,
                checked: false,
                quantity: 0 // Default quantity value is 0 when unchecked
            };
        })

    aisles = new Set(products.map(p => p.aisle));
    updateAisleSelect();
    saveData();
    displayProducts();
}

// Funciones de gestión de productos
function showAddItemForm() {
    if (!isAdmin) {
        alert('Solo el administrador puede añadir nuevos productos.');
        return;
    }
    document.getElementById('add-item-form').classList.remove('hidden');
}

function hideAddItemForm() {
    document.getElementById('add-item-form').classList.add('hidden');
}

function addNewItem() {
    const name = document.getElementById('new-item-name').value.trim();
    const aisle = document.getElementById('new-item-aisle').value;

    if (name && aisle) {
        products.push({
            name,
            aisle,
            checked: false,
            quantity: 0 // Default quantity value is 0 when unchecked
        });

        saveData();
        displayProducts();
        hideAddItemForm();
        document.getElementById('new-item-name').value = '';
    } else {
        // Show error if name or aisle is missing
        alert('Por favor, ingrese un nombre de producto y seleccione un pasillo.');
    }
}

function updateAisleSelect() {
    const select = document.getElementById('new-item-aisle');
    select.innerHTML = '';
    Array.from(aisles).sort().forEach(aisle => {
        const option = document.createElement('option');
        option.value = aisle;
        option.textContent = aisle;
        select.appendChild(option);
    });
}

// Funciones de visualización
function displayProducts(showOnlyChecked = false) {
    const container = document.getElementById('products-container');
    container.innerHTML = '';

    const groupedProducts = {};
    products.forEach(product => {
        if (!showOnlyChecked || product.checked) {
            if (!groupedProducts[product.aisle]) {
                groupedProducts[product.aisle] = [];
            }
            groupedProducts[product.aisle].push(product);
            // Hide edit/delete buttons for non-admin users
            if (!isAdmin) {
                const editButtons = document.querySelectorAll('.edit-btn, .delete-btn');
                editButtons.forEach(btn => btn.style.display = 'none');
            }
        }
    });

    // Ordenar los pasillos por su número inicial si existe
    const sortedAisles = Object.keys(groupedProducts).sort((a, b) => {
        const aNum = parseInt(a.match(/^\d+/));
        const bNum = parseInt(b.match(/^\d+/));
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
        }
        return a.localeCompare(b);
    });

    sortedAisles.forEach(aisle => {
        const section = document.createElement('div');
        section.className = 'aisle-section';
        
        // Extraer el número del pasillo si existe
        const aisleMatch = aisle.match(/^(\d+)\s+(.+)/);
        let aisleTitle = aisle;
        if (aisleMatch) {
            aisleTitle = `${aisleMatch[1]} - ${aisleMatch[2]}`;
        }
        
        section.innerHTML = `<h2>${aisleTitle}</h2>`;

        // Ordenar productos alfabéticamente
        const sortedProducts = groupedProducts[aisle].sort((a, b) => 
            a.name.localeCompare(b.name)
        );

        sortedProducts.forEach(product => {
            const item = document.createElement('div');
            item.className = 'product-item';
            
            // Simplificar la interfaz móvil mostrando el selector de pasillo solo al hacer clic en un botón
            item.innerHTML = `
                <input type="checkbox" id="${product.name.replace(/"/g, '&quot;')}" 
                    ${product.checked ? 'checked' : ''}
                    onchange="toggleProduct('${product.name.replace(/'/g, "\\'")}')"
                >
                <label for="${product.name.replace(/"/g, '&quot;')}">${product.name}</label>
                <input type="number" class="quantity-input" 
                    min="0" max="25" value="${product.checked ? (product.quantity || 1) : 0}" 
                    onchange="updateQuantity('${product.name.replace(/'/g, "\\'")}', this.value)"
                    ${!product.checked ? 'disabled' : ''}
                    aria-label="Cantidad">
                <button class="change-aisle-btn" onclick="toggleAisleSelector(this)" aria-label="Cambiar pasillo">
                    <span>⋮</span>
                </button>
                <div class="aisle-selector hidden">
                    <select onchange="changeAisle('${product.name.replace(/'/g, "\\'")}', this.value)">
                        ${Array.from(aisles).sort().map(a => 
                            `<option value="${a.replace(/"/g, '&quot;')}" ${a === product.aisle ? 'selected' : ''}>
                                ${a}
                            </option>`
                        ).join('')}
                    </select>
                </div>
            `;
            section.appendChild(item);
        });

        container.appendChild(section);
    });
}

// Función para mostrar/ocultar el selector de pasillo en móviles
function toggleAisleSelector(button) {
    const selector = button.nextElementSibling;
    selector.classList.toggle('hidden');
}

// Mejora la experiencia táctil detectando el tipo de dispositivo
function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

// Inicialización con detección de dispositivo táctil
document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = savedUser;
        // Restaurar el estado de administrador desde localStorage
        isAdmin = localStorage.getItem('isAdmin') === 'true';
        document.getElementById('user-name').textContent = savedUser;
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('main-container').classList.remove('hidden');
        loadUserList();
        updateAdminControls(); // Actualizar controles según el estado de administrador
    }
    
    // Añadir clase para dispositivos táctiles
    if (isTouchDevice()) {
        document.body.classList.add('touch-device');
    }
});
function toggleProduct(productName) {
    const product = products.find(p => p.name === productName);
    if (product) {
        product.checked = !product.checked;
        // Set quantity to 1 when checked, 0 when unchecked
        if (product.checked) {
            product.quantity = 1;
        } else {
            product.quantity = 0;
        }
        saveData();
        // Update the quantity input field in the UI
        const quantityInput = document.querySelector(`input[type="number"][onchange*="${productName.replace(/'/g, "\\'")}"]`);
        if (quantityInput) {
            quantityInput.value = product.quantity;
            // Enable/disable the quantity input based on checkbox state
            quantityInput.disabled = !product.checked;
        }
    }
}

function updateQuantity(productName, quantity) {
    const product = products.find(p => p.name === productName);
    if (product) {
        // Parse the quantity as an integer
        let qty = parseInt(quantity) || 0;
        
        // Update the checkbox state based on quantity
        if (qty > 0) {
            product.checked = true;
            // Ensure quantity is between 1 and 25
            qty = Math.min(Math.max(qty, 1), 25);
            // Update checkbox in UI
            const checkbox = document.getElementById(product.name.replace(/"/g, '&quot;'));
            if (checkbox) {
                checkbox.checked = true;
            }
        } else {
            // If quantity is 0, uncheck the product
            product.checked = false;
            qty = 0;
            // Update checkbox in UI
            const checkbox = document.getElementById(product.name.replace(/"/g, '&quot;'));
            if (checkbox) {
                checkbox.checked = false;
            }
        }
        
        product.quantity = qty;
        
        // Update the input field value to reflect the validated quantity
        const quantityInput = document.querySelector(`input[type="number"][onchange*="${productName.replace(/'/g, "\\'")}"]`);
        if (quantityInput) {
            quantityInput.value = qty;
            // Enable/disable the quantity input based on checkbox state
            quantityInput.disabled = !product.checked;
        }
        
        saveData();
    }
}

function changeAisle(productName, newAisle) {
    const product = products.find(p => p.name === productName);
    if (product) {
        product.aisle = newAisle;
        saveData();
        displayProducts();
    }
}

function showAllItems() {
    // Si no es admin y no tiene productos cargados, intentar cargar la lista maestra
    if (!isAdmin && products.length === 0) {
        const masterProducts = localStorage.getItem('master_products_list');
        if (masterProducts) {
            products = JSON.parse(masterProducts).map(product => ({
                ...product,
                checked: false,
                quantity: 0
            }));
            aisles = new Set(products.map(p => p.aisle));
            updateAisleSelect();
            saveData();
        }
    }
    displayProducts(false);
}

function showMyList() {
    displayProducts(true);
}

// Función para confirmar y borrar la lista del usuario
function confirmDeleteList() {
    if (confirm('¿Estás seguro de que deseas borrar tu lista de compras? Esta acción desmarcará todos los productos seleccionados.')) {
        clearUserList();
    }
}

function clearUserList() {
    // Desmarcar todos los productos
    products.forEach(product => {
        product.checked = false;
    });
    
    // Guardar cambios y actualizar la vista
    saveData();
    displayProducts();
    alert('Tu lista ha sido borrada correctamente.');
}

// Funciones de persistencia de datos
function saveData() {
    if (currentUser) {
        // Si es admin, guardar también en la lista maestra de productos
        if (isAdmin) {
            localStorage.setItem('master_products_list', JSON.stringify(products));
        }
        // Guardar la lista específica del usuario (con sus selecciones)
        localStorage.setItem(`products_${currentUser}`, JSON.stringify(products));
    }
}

function loadUserList() {
    // Primero intentamos cargar la lista específica del usuario
    const savedProducts = localStorage.getItem(`products_${currentUser}`);
    
    if (savedProducts) {
        // El usuario tiene su propia lista guardada
        products = JSON.parse(savedProducts);
    } else {
        // Si el usuario no tiene lista propia, intentamos cargar la lista maestra
        const masterProducts = localStorage.getItem('master_products_list');
        if (masterProducts) {
            // Usamos la lista maestra pero reseteamos los checks (para que sea la lista del usuario)
            products = JSON.parse(masterProducts).map(product => ({
                ...product,
                checked: false,
                quantity: 0
            }));
            // Guardamos esta nueva lista para el usuario
            saveData();
        } else {
            // No hay lista maestra ni de usuario, inicializamos vacía
            products = [];
        }
    }
    
    aisles = new Set(products.map(p => p.aisle));
    updateAisleSelect();
    displayProducts();
}

// Initialize application state from localStorage
window.onload = function() {
    const savedUser = localStorage.getItem('currentUser');
    const savedIsAdmin = localStorage.getItem('isAdmin') === 'true';
    
    if (savedUser) {
        currentUser = savedUser;
        isAdmin = savedIsAdmin;
        document.getElementById('user-name').textContent = savedUser;
        document.getElementById('auth-container').classList.add('hidden');
        document.getElementById('main-container').classList.remove('hidden');
        loadUserList();
        updateAdminControls();
    }
}

// Función para generar un PDF con la lista de compras
function generatePDF() {
    // Verificar si hay productos seleccionados
    const selectedProducts = products.filter(p => p.checked);
    if (selectedProducts.length === 0) {
        alert('No hay productos seleccionados para generar el PDF.');
        return;
    }

    // Crear un nuevo documento PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configurar fuentes y estilos para el título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    
    // Añadir título
    doc.text('Lista de Compras - Mercadona', 105, 10, { align: 'center' });
    
    // Añadir información del usuario y fecha con fuente más pequeña
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const today = new Date();
    const dateStr = today.toLocaleDateString('es-ES');
    doc.text(`Usuario: ${currentUser}`, 20, 18);
    doc.text(`Fecha: ${dateStr}`, 20, 23);
    
    // Agrupar productos por pasillo
    const groupedProducts = {};
    selectedProducts.forEach(product => {
        if (!groupedProducts[product.aisle]) {
            groupedProducts[product.aisle] = [];
        }
        groupedProducts[product.aisle].push(product);
    });
    
    // Ordenar los pasillos por su número inicial si existe
    const sortedAisles = Object.keys(groupedProducts).sort((a, b) => {
        const aNum = parseInt(a.match(/^\d+/));
        const bNum = parseInt(b.match(/^\d+/));
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
        }
        return a.localeCompare(b);
    });
    
    // Variables para controlar la posición en el PDF
    let yPosition = 30;
    const pageHeight = doc.internal.pageSize.height;
    const lineHeight = 5; // Reducido de 8 a 5 para ajustar más productos por página
    let productCount = 0;
    const productsPerPage = 50; // Objetivo: aproximadamente 50 productos por página
    
    // Añadir cada pasillo y sus productos
    sortedAisles.forEach(aisle => {
        // Comprobar si necesitamos una nueva página basado en el número de productos
        if (productCount >= productsPerPage) {
            doc.addPage();
            yPosition = 15;
            productCount = 0;
        }
        
        // También verificar si hay suficiente espacio para el título del pasillo
        if (yPosition > pageHeight - 15) {
            doc.addPage();
            yPosition = 15;
            productCount = 0;
        }
        
        // Extraer el número del pasillo si existe
        const aisleMatch = aisle.match(/^(\d+)\s+(.+)/);
        let aisleTitle = aisle;
        if (aisleMatch) {
            aisleTitle = `${aisleMatch[1]} - ${aisleMatch[2]}`;
        }
        
        // Añadir título del pasillo con fuente más pequeña
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(aisleTitle, 20, yPosition);
        yPosition += lineHeight;
        
        // Ordenar productos alfabéticamente
        const sortedProducts = groupedProducts[aisle].sort((a, b) => 
            a.name.localeCompare(b.name)
        );
        
        // Añadir cada producto con fuente más pequeña
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9); // Reducido de 12 a 9 para ajustar más productos por página
        sortedProducts.forEach(product => {
            // Comprobar si necesitamos una nueva página basado en el número de productos
            if (productCount >= productsPerPage) {
                doc.addPage();
                yPosition = 15;
                productCount = 0;
            }
            
            // También verificar si hay suficiente espacio para el producto
            if (yPosition > pageHeight - 10) {
                doc.addPage();
                yPosition = 15;
                productCount = 0;
            }
            
            // Añadir checkbox, nombre del producto y cantidad
            doc.rect(20, yPosition - 3, 4, 4); // Checkbox más pequeño
            doc.text(product.name, 28, yPosition);
            
            // Añadir cantidad si es mayor que 1
            if (product.quantity && product.quantity > 1) {
                const quantityText = `x${product.quantity}`;
                const textWidth = doc.getStringUnitWidth(product.name) * doc.getFontSize() / doc.internal.scaleFactor;
                doc.text(quantityText, 28 + textWidth + 5, yPosition);
            }
            yPosition += lineHeight;
            productCount++;
        });
        
        // Añadir un pequeño espacio después de cada pasillo
        yPosition += 2; // Reducido de 5 a 2 para ajustar más productos por página
    });
    
    // Guardar el PDF
    doc.save(`Lista_Compras_${currentUser}_${dateStr.replace(/\//g, '-')}.pdf`);
}

function showProductManagement() {
    if (!isAdmin) {
        alert('Solo el administrador puede gestionar productos.');
        return;
    }
    document.getElementById('product-management').classList.remove('hidden');
    const productList = document.getElementById('product-list');
    productList.innerHTML = '';
    
    // Update aisle select for editing
    const editAisleSelect = document.getElementById('edit-product-aisle');
    editAisleSelect.innerHTML = '';
    Array.from(aisles).sort().forEach(aisle => {
        const option = document.createElement('option');
        option.value = aisle;
        option.textContent = aisle;
        editAisleSelect.appendChild(option);
    });

    // Display all products for editing
    products.forEach((product, index) => {
        const productDiv = document.createElement('div');
        productDiv.className = 'product-item';
        productDiv.innerHTML = `
            <span>${product.name} (${product.aisle})</span>
            <div class="product-actions">
                <button onclick="editProduct(${index})" class="edit-btn">Editar</button>
                <button onclick="deleteProduct(${index})" class="delete-btn">Eliminar</button>
            </div>
        `;
        productList.appendChild(productDiv);
    });
}

function hideProductManagement() {
    document.getElementById('product-management').classList.add('hidden');
}

function editProduct(index) {
    if (!isAdmin) {
        alert('Solo el administrador puede editar productos.');
        return;
    }
    const product = products[index];
    document.getElementById('edit-product-name').value = product.name;
    document.getElementById('edit-product-aisle').value = product.aisle;
    document.getElementById('edit-product-name').dataset.editIndex = index;
}

function deleteProduct(index) {
    if (confirm('¿Está seguro de que desea eliminar este producto?')) {
        products.splice(index, 1);
        saveData();
        showProductManagement(); // Refresh the list
        displayProducts(); // Update main display
    }
}

function saveProductChanges() {
    const nameInput = document.getElementById('edit-product-name');
    const aisleSelect = document.getElementById('edit-product-aisle');
    const index = nameInput.dataset.editIndex;

    if (index !== undefined) {
        const newName = nameInput.value.trim();
        const newAisle = aisleSelect.value;

        if (newName && newAisle) {
            products[index].name = newName;
            products[index].aisle = newAisle;
            saveData();
            showProductManagement(); // Refresh the list
            displayProducts(); // Update main display
            nameInput.value = '';
            nameInput.dataset.editIndex = '';
        } else {
            alert('Por favor, complete todos los campos.');
        }
    }
}


function exportToText() {
    // Verify if there are selected products
    const selectedProducts = products.filter(p => p.checked);
    if (selectedProducts.length === 0) {
        alert('No hay productos seleccionados para exportar.');
        return;
    }

    // Group products by aisle
    const groupedProducts = {};
    selectedProducts.forEach(product => {
        if (!groupedProducts[product.aisle]) {
            groupedProducts[product.aisle] = [];
        }
        groupedProducts[product.aisle].push(product);
    });

    // Sort aisles by their initial number if it exists
    const sortedAisles = Object.keys(groupedProducts).sort((a, b) => {
        const aNum = parseInt(a.match(/^\d+/));
        const bNum = parseInt(b.match(/^\d+/));
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return aNum - bNum;
        }
        return a.localeCompare(b);
    });

    // Create text content
    let textContent = 'Lista de Compras - Mercadona\n';
    textContent += `Usuario: ${currentUser}\n`;
    textContent += `Fecha: ${new Date().toLocaleDateString('es-ES')}\n\n`;

    // Add products by aisle
    sortedAisles.forEach(aisle => {
        // Format aisle title
        const aisleMatch = aisle.match(/^(\d+)\s+(.+)/);
        let aisleTitle = aisle;
        if (aisleMatch) {
            aisleTitle = `${aisleMatch[1]} - ${aisleMatch[2]}`;
        }
        textContent += `${aisleTitle}\n`;

        // Sort products alphabetically
        const sortedProducts = groupedProducts[aisle].sort((a, b) => 
            a.name.localeCompare(b.name)
        );

        // Add each product
        sortedProducts.forEach(product => {
            let productLine = `[ ] ${product.name}`;
            if (product.quantity && product.quantity > 1) {
                productLine += ` x${product.quantity}`;
            }
            textContent += `${productLine}\n`;
        });
        textContent += '\n';
    });

    // Create and download the text file
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Lista_Compras_${currentUser}_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}