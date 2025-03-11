/**
 * ESTADO GLOBAL DE LA APLICACIÓN
 * Estas variables mantienen el estado de la aplicación durante la sesión del usuario
 */
let products = [];       // Lista de productos cargados
let aisles = new Set();  // Conjunto de pasillos disponibles (sin duplicados)
let currentUser = null;  // Usuario actual
let isAdmin = false;     // Indica si el usuario actual es administrador

// Load products when the page loads
// This function is merged with the authentication window.onload below

// Function to load products from the CSV file
async function loadProductsFromFile() {
    try {
        console.log('Intentando cargar productos desde CSV...');
        const response = await fetch('compra mercadona.csv');
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        const content = await response.text();
        console.log('CSV cargado correctamente, procesando datos...');
        
        // Process the CSV content
        const rows = content.split('\n').map(row => row.split(';'));
        const jsonData = rows.slice(1)
            .filter(row => row.length >= 2 && row[1] && row[1].trim() !== '')
            .map(row => ({
                Producto: row[1]?.trim() || '',
                Pasillo: row[0]?.trim() || 'Sin Pasillo'
            }));
        
        console.log(`Datos procesados: ${jsonData.length} productos encontrados`);
        processExcelData(jsonData);
    } catch (error) {
        console.error('Error loading products:', error);
        alert('Error al cargar los productos. Por favor, inténtelo de nuevo más tarde.');
    }
}

// Function to load saved list from localStorage
function loadSavedList() {
    const savedList = localStorage.getItem('shopping_list');
    if (savedList) {
        const savedProducts = JSON.parse(savedList);
        products = products.map(p => {
            const savedProduct = savedProducts.find(sp => sp.name === p.name);
            return savedProduct ? {...p, ...savedProduct} : p;
        });
        displayProducts();
    }
}

function processExcelData(data) {
    console.log('Procesando datos de productos...');
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
        });

    console.log(`Productos procesados: ${products.length}`);
    aisles = new Set(products.map(p => p.aisle));
    console.log(`Pasillos encontrados: ${aisles.size}`);
    updateAisleSelect();
    saveData();
    displayProducts();
}

// Save data to localStorage
function saveData() {
    const savedProducts = products.map(p => ({
        name: p.name,
        aisle: p.aisle,
        checked: p.checked,
        quantity: p.quantity || 0
    }));
    // Save to user-specific storage if user is logged in
    if (currentUser) {
        localStorage.setItem(`products_${currentUser}`, JSON.stringify(savedProducts));
    } else {
        localStorage.setItem('shopping_list', JSON.stringify(savedProducts));
    }
}

// Funciones de visualización
function displayProducts(showOnlyChecked = false) {
    console.log(`Mostrando productos (solo marcados: ${showOnlyChecked})`);
    console.log(`Total de productos disponibles: ${products.length}`);
    
    const container = document.getElementById('products-container');
    if (!container) {
        console.error('Error: No se encontró el contenedor de productos');
        return;
    }
    container.innerHTML = '';

    const groupedProducts = {};
    products.forEach(product => {
        if (!showOnlyChecked || product.checked) {
            if (!groupedProducts[product.aisle]) {
                groupedProducts[product.aisle] = [];
            }
            groupedProducts[product.aisle].push(product);
        }
    });

    const aisleCount = Object.keys(groupedProducts).length;
    console.log(`Pasillos a mostrar: ${aisleCount}`);

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
    
    console.log('Visualización de productos completada');
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
    // Desmarcar todos los productos y resetear cantidades
    products.forEach(product => {
        product.checked = false;
        product.quantity = 0;
    });
    
    // Guardar cambios y actualizar la vista
    saveData();
    displayProducts(false); // Explicitly show all products after clearing the list
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
    // Load products from CSV file first
    loadProductsFromFile();
    
    // Then handle authentication
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
    } else {
        // Initialize default values for non-authenticated users
        currentUser = 'guest';
        isAdmin = false;
        // Display products directly without requiring authentication
        showAllItems();
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

    try {
        // Create text file name
        const fileName = `Lista_Compras_${currentUser}_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.txt`;
        
        // For iOS devices
        if (navigator.userAgent.match(/ipad|iphone|ipod/i)) {
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const reader = new FileReader();
            
            reader.onload = function(e) {
                const a = document.createElement('a');
                a.href = e.target.result;
                a.download = fileName;
                a.click();
            };
            
            reader.readAsDataURL(blob);
        } 
        // For Android and other devices
        else {
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            
            // Append to body and trigger download
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
    } catch (error) {
        console.error('Error exporting text file:', error);
        alert('Hubo un error al exportar el archivo. Por favor, inténtelo de nuevo.');
    }
}

// Function to update the aisle select dropdown in the UI
function updateAisleSelect() {
    // This function is called when aisles are loaded or changed
    // It doesn't need to do anything in the current implementation
    // as the aisle selectors are generated dynamically in the displayProducts function
    console.log('Aisles updated:', Array.from(aisles));
}

// Function to update admin controls visibility based on user role
function updateAdminControls() {
    // This function is called when user authentication status changes
    // It should show/hide admin-specific controls based on isAdmin status
    console.log('Admin status updated:', isAdmin);
    // Since there are no specific admin controls in the current HTML, this is just a placeholder
    // If admin controls are added later, they can be shown/hidden here
}