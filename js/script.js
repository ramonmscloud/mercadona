/**
 * ESTADO GLOBAL DE LA APLICACIÓN
 * Estas variables mantienen el estado de la aplicación durante la sesión del usuario
 */
let products = [];       // Lista de productos cargados
let aisles = new Set();  // Conjunto de pasillos disponibles (sin duplicados)
let currentUser = null;  // Usuario actual
let isAdmin = false;     // Indica si el usuario actual es administrador
let listObservations = ''; // Observaciones de la lista

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
        
        // Load observations
        listObservations = savedData.observations || '';
        document.getElementById('list-observations').value = listObservations;
        
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
    console.log('Guardando datos en localStorage...');
    const savedProducts = products.map(p => ({
        name: p.name,
        aisle: p.aisle,
        checked: p.checked,
        quantity: p.quantity || 0
    }));
    
    // Get observations
    listObservations = document.getElementById('list-observations').value;
    
    const saveData = {
        products: savedProducts,
        observations: listObservations
    };
    
    // Log the number of checked products for debugging
    const checkedCount = savedProducts.filter(p => p.checked).length;
    console.log(`Guardando ${savedProducts.length} productos (${checkedCount} seleccionados)`);
    
    // Save to user-specific storage if user is logged in
    if (currentUser) {
        if (isAdmin) {
            localStorage.setItem('master_products_list', JSON.stringify(products));
            console.log('Lista maestra guardada (admin)');
        }
        localStorage.setItem(`products_${currentUser}`, JSON.stringify(saveData));
        console.log(`Lista guardada para usuario: ${currentUser}`);
    } else {
        localStorage.setItem('shopping_list', JSON.stringify(saveData));
        console.log('Lista guardada para usuario anónimo');
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
    console.log(`Toggling product: ${productName}`);
    const product = products.find(p => p.name === productName);
    if (product) {
        product.checked = !product.checked;
        // Set quantity to 1 when checked, 0 when unchecked
        if (product.checked) {
            product.quantity = 1;
            console.log(`Producto marcado: ${product.name}, cantidad: ${product.quantity}`);
        } else {
            product.quantity = 0;
            console.log(`Producto desmarcado: ${product.name}, cantidad: ${product.quantity}`);
        }
        
        // Update the quantity input field in the UI
        const quantityInput = document.querySelector(`input[type="number"][onchange*="${productName.replace(/'/g, "\\'")}"]`);
        if (quantityInput) {
            quantityInput.value = product.quantity;
            // Enable/disable the quantity input based on checkbox state
            quantityInput.disabled = !product.checked;
            console.log(`Campo de cantidad actualizado: ${quantityInput.value}, disabled: ${quantityInput.disabled}`);
        } else {
            console.warn(`No se encontró el campo de cantidad para: ${productName}`);
        }
        
        // Save changes to localStorage
        saveData();
        
        // Force a complete UI refresh to ensure all changes are reflected
        displayProducts();
    } else {
        console.error(`Producto no encontrado: ${productName}`);
    }
}

function updateQuantity(productName, quantity) {
    console.log(`Actualizando cantidad para: ${productName} a ${quantity}`);
    const product = products.find(p => p.name === productName);
    if (product) {
        // Parse the quantity as an integer
        let qty = parseInt(quantity) || 0;
        
        // Update the checkbox state based on quantity
        if (qty > 0) {
            product.checked = true;
            // Ensure quantity is between 1 and 25
            qty = Math.min(Math.max(qty, 1), 25);
        } else {
            // If quantity is 0, uncheck the product
            product.checked = false;
            qty = 0;
        }
        
        product.quantity = qty;
        
        // Update the UI
        const checkbox = document.getElementById(product.name.replace(/"/g, '&quot;'));
        if (checkbox) {
            checkbox.checked = product.checked;
        }
        
        const quantityInput = document.querySelector(`input[type="number"][onchange*="${productName.replace(/'/g, "\\'")}"]`);
        if (quantityInput) {
            quantityInput.value = qty;
            quantityInput.disabled = !product.checked;
        }
        
        // Save changes to localStorage
        saveData();
        
        // Force a complete UI refresh to ensure all changes are reflected
        displayProducts();
        
        console.log(`Producto actualizado: ${product.name}, checked: ${product.checked}, quantity: ${product.quantity}`);
    } else {
        console.error(`Producto no encontrado: ${productName}`);
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
    console.log('Borrando lista de usuario...');
    
    // Reset all products to their initial state
    products = products.map(product => ({
        ...product,
        checked: false,
        quantity: 0
    }));
    
    // Clear observations
    listObservations = '';
    document.getElementById('list-observations').value = '';
    
    // Clear user-specific data from localStorage
    if (currentUser) {
        localStorage.removeItem(`products_${currentUser}`);
        // Reload from master list if available
        const masterProducts = localStorage.getItem('master_products_list');
        if (masterProducts) {
            products = JSON.parse(masterProducts).map(product => ({
                ...product,
                checked: false,
                quantity: 0
            }));
        }
    } else {
        localStorage.removeItem('shopping_list');
    }
    
    // Save the updated products list
    saveData();
    
    // Ensure all checkboxes and quantity inputs are reset immediately
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const quantityInputs = document.querySelectorAll('.quantity-input');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    quantityInputs.forEach(input => {
        input.value = '0';
        input.disabled = true;
    });
    
    // Force immediate UI refresh after DOM elements are updated
    displayProducts(false);
    
    // Show confirmation message
    alert('Tu lista ha sido borrada correctamente.');
    console.log('Lista borrada correctamente');
}

// Funciones de persistencia de datos
// This function has been moved to the main saveData() implementation above

function loadUserList() {
    // Primero intentamos cargar la lista específica del usuario
    const savedData = localStorage.getItem(`products_${currentUser}`);
    
    if (savedData) {
        // El usuario tiene su propia lista guardada
        const parsedData = JSON.parse(savedData);
        products = parsedData.products || [];
        listObservations = parsedData.observations || '';
        document.getElementById('list-observations').value = listObservations;
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
            // Reseteamos las observaciones para el nuevo usuario
            listObservations = '';
            document.getElementById('list-observations').value = '';
            // Guardamos esta nueva lista para el usuario
            saveData();
        } else {
            // No hay lista maestra ni de usuario, inicializamos vacía
            products = [];
            listObservations = '';
            document.getElementById('list-observations').value = '';
        }
    }
    
    aisles = new Set(products.map(p => p.aisle));
    updateAisleSelect();
    displayProducts();
}

// Initialize the application when the page loads
window.onload = async function() {
    console.log('Inicializando aplicación...');
    try {
        // Load products from CSV file
        await loadProductsFromFile();
        console.log('Productos cargados desde CSV');
        
        // Load saved list from localStorage
        loadSavedList();
        console.log('Lista guardada cargada desde localStorage');
        
        // Display products
        displayProducts();
        console.log('Productos mostrados en la UI');
    } catch (error) {
        console.error('Error durante la inicialización:', error);
        alert('Error al inicializar la aplicación. Por favor, recarga la página.');
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
    // Get checked products
    const checkedProducts = products.filter(p => p.checked);
    if (checkedProducts.length === 0) {
        alert('No hay productos seleccionados para exportar.');
        return;
    }

    // Group products by aisle
    const groupedProducts = {};
    checkedProducts.forEach(product => {
        if (!groupedProducts[product.aisle]) {
            groupedProducts[product.aisle] = [];
        }
        groupedProducts[product.aisle].push({
            name: product.name,
            quantity: product.quantity || 1
        });
    });

    // Create text content
    let textContent = 'LISTA DE COMPRAS\n\n';

    // Add products grouped by aisle
    Object.keys(groupedProducts).sort().forEach(aisle => {
        textContent += `${aisle}:\n`;
        groupedProducts[aisle].sort((a, b) => a.name.localeCompare(b.name)).forEach(product => {
            textContent += `- ${product.name} (${product.quantity})\n`;
        });
        textContent += '\n';
    });

    // Add observations if they exist
    const observations = document.getElementById('list-observations').value.trim();
    if (observations) {
        textContent += '\nOBSERVACIONES:\n';
        textContent += observations + '\n';
    }

    // Create and download the text file
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lista_compra.txt';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

async function loadTextFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';

    input.onchange = async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const text = await file.text();
        const lines = text.split('\n');

        let currentAisle = '';
        let isObservations = false;
        let observations = [];

        // Reset all products to unchecked
        products.forEach(p => {
            p.checked = false;
            p.quantity = 0;
        });

        // Parse the text file
        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            if (line.toLowerCase() === 'observaciones:') {
                isObservations = true;
                continue;
            }

            if (isObservations) {
                observations.push(line);
                continue;
            }

            if (line.endsWith(':')) {
                currentAisle = line.slice(0, -1);
                continue;
            }

            if (line.startsWith('-')) {
                const productLine = line.slice(1).trim();
                const match = productLine.match(/(.+?)\s*\((\d+)\)/);
                
                if (match) {
                    const productName = match[1].trim();
                    const quantity = parseInt(match[2]);

                    const product = products.find(p => 
                        p.name.toLowerCase() === productName.toLowerCase() && 
                        p.aisle === currentAisle
                    );

                    if (product) {
                        product.checked = true;
                        product.quantity = quantity;
                    }
                }
            }
        }

        // Set observations
        const observationsText = observations.join('\n');
        document.getElementById('list-observations').value = observationsText;
        listObservations = observationsText;

        // Save and display
        saveData();
        displayProducts();
    };

    input.click();
}