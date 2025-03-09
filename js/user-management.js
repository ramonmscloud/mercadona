/**
 * GESTIÓN DE USUARIOS
 * Este módulo maneja la funcionalidad de gestión de usuarios para el administrador
 */

// Array para almacenar los usuarios registrados (máximo 5)
let registeredUsers = [];
const MAX_USERS = 5;

// Inicializar el módulo de gestión de usuarios
function initUserManagement() {
    loadRegisteredUsers();
    // Make isAdmin available globally for other functions in this file
    window.isAdmin = localStorage.getItem('isAdmin') === 'true';
}

// Cargar usuarios registrados desde localStorage
function loadRegisteredUsers() {
    const savedUsers = localStorage.getItem('registeredUsers');
    if (savedUsers) {
        registeredUsers = JSON.parse(savedUsers);
    }
}

// Guardar usuarios registrados en localStorage
function saveRegisteredUsers() {
    localStorage.setItem('registeredUsers', JSON.stringify(registeredUsers));
}

// Mostrar el panel de gestión de usuarios
function showUserManagement() {
    // Check if user is admin by reading from localStorage instead of window object
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) {
        alert('Solo el administrador puede gestionar usuarios.');
        return;
    }
    
    document.getElementById('user-management').classList.remove('hidden');
    refreshUserList();
}

// Ocultar el panel de gestión de usuarios
function hideUserManagement() {
    document.getElementById('user-management').classList.add('hidden');
}

// Actualizar la lista de usuarios en la interfaz
function refreshUserList() {
    const userList = document.getElementById('user-list');
    userList.innerHTML = '';
    
    registeredUsers.forEach((user, index) => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.innerHTML = `
            <span>${user.username}</span>
            <div class="user-actions">
                <button onclick="editUser(${index})" class="edit-btn">Editar</button>
                <button onclick="deleteUser(${index})" class="delete-btn">Eliminar</button>
            </div>
        `;
        userList.appendChild(userDiv);
    });
    
    // Mostrar u ocultar el botón de añadir usuario según el límite
    const addUserBtn = document.getElementById('add-user-btn');
    if (addUserBtn) {
        addUserBtn.style.display = registeredUsers.length >= MAX_USERS ? 'none' : 'block';
    }
}

// Mostrar formulario para añadir un nuevo usuario
function showAddUserForm() {
    if (registeredUsers.length >= MAX_USERS) {
        alert(`No se pueden añadir más usuarios. El límite es de ${MAX_USERS} usuarios.`);
        return;
    }
    
    document.getElementById('add-user-form').classList.remove('hidden');
    document.getElementById('new-username').value = '';
    document.getElementById('new-username').focus();
}

// Ocultar formulario para añadir un nuevo usuario
function hideAddUserForm() {
    document.getElementById('add-user-form').classList.add('hidden');
}

// Añadir un nuevo usuario
function addNewUser() {
    // Check admin status from localStorage
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) {
        alert('Solo el administrador puede añadir usuarios.');
        return;
    }
    
    const username = document.getElementById('new-username').value.trim();
    
    // Validaciones
    if (!username) {
        alert('Por favor, ingrese un nombre de usuario.');
        return;
    }
    
    if (username.toLowerCase() === 'admin') {
        alert('No se puede crear un usuario con el nombre "admin".');
        return;
    }
    
    if (registeredUsers.some(user => user.username.toLowerCase() === username.toLowerCase())) {
        alert('Este nombre de usuario ya existe. Por favor, elija otro.');
        return;
    }
    
    if (registeredUsers.length >= MAX_USERS) {
        alert(`No se pueden añadir más usuarios. El límite es de ${MAX_USERS} usuarios.`);
        return;
    }
    
    // Añadir el nuevo usuario
    registeredUsers.push({
        username: username,
        createdAt: new Date().toISOString()
    });
    
    // Guardar y actualizar la interfaz
    saveRegisteredUsers();
    refreshUserList();
    hideAddUserForm();
    
    alert(`Usuario "${username}" creado correctamente.`);
}

// Editar un usuario existente
function editUser(index) {
    // Check admin status from localStorage
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) {
        alert('Solo el administrador puede editar usuarios.');
        return;
    }
    
    const user = registeredUsers[index];
    if (!user) return;
    
    document.getElementById('edit-username').value = user.username;
    document.getElementById('edit-username').dataset.editIndex = index;
    document.getElementById('edit-user-form').classList.remove('hidden');
    document.getElementById('edit-username').focus();
}

// Ocultar formulario de edición de usuario
function hideEditUserForm() {
    document.getElementById('edit-user-form').classList.add('hidden');
}

// Guardar cambios de un usuario editado
function saveUserChanges() {
    // Check admin status from localStorage
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) {
        alert('Solo el administrador puede modificar usuarios.');
        return;
    }
    
    const usernameInput = document.getElementById('edit-username');
    const index = usernameInput.dataset.editIndex;
    const newUsername = usernameInput.value.trim();
    
    // Validaciones
    if (!newUsername) {
        alert('Por favor, ingrese un nombre de usuario.');
        return;
    }
    
    if (newUsername.toLowerCase() === 'admin') {
        alert('No se puede usar el nombre "admin".');
        return;
    }
    
    // Verificar si el nuevo nombre ya existe (excluyendo el usuario actual)
    const userExists = registeredUsers.some((user, i) => 
        i !== parseInt(index) && user.username.toLowerCase() === newUsername.toLowerCase()
    );
    
    if (userExists) {
        alert('Este nombre de usuario ya existe. Por favor, elija otro.');
        return;
    }
    
    // Obtener el nombre de usuario anterior para actualizar los datos guardados
    const oldUsername = registeredUsers[index].username;
    
    // Actualizar el nombre de usuario
    registeredUsers[index].username = newUsername;
    
    // Actualizar los datos del usuario en localStorage
    const userProducts = localStorage.getItem(`products_${oldUsername}`);
    if (userProducts) {
        localStorage.setItem(`products_${newUsername}`, userProducts);
        localStorage.removeItem(`products_${oldUsername}`);
    }
    
    // Guardar y actualizar la interfaz
    saveRegisteredUsers();
    refreshUserList();
    hideEditUserForm();
    
    alert(`Usuario actualizado correctamente.`);
}

// Eliminar un usuario
function deleteUser(index) {
    // Check admin status from localStorage
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (!isAdmin) {
        alert('Solo el administrador puede eliminar usuarios.');
        return;
    }
    
    if (!confirm('¿Está seguro de que desea eliminar este usuario? Se perderá su lista de compras.')) {
        return;
    }
    
    const username = registeredUsers[index].username;
    
    // Eliminar los datos del usuario
    localStorage.removeItem(`products_${username}`);
    
    // Eliminar el usuario de la lista
    registeredUsers.splice(index, 1);
    
    // Guardar y actualizar la interfaz
    saveRegisteredUsers();
    refreshUserList();
    
    alert(`Usuario "${username}" eliminado correctamente.`);
}

// Verificar si un usuario está registrado
function isUserRegistered(username) {
    // El administrador siempre está permitido
    if (username.toLowerCase() === 'admin') {
        return true;
    }
    
    // Verificar si el usuario está en la lista de usuarios registrados
    return registeredUsers.some(user => user.username.toLowerCase() === username.toLowerCase());
}

// Exportar funciones para uso global
window.showUserManagement = showUserManagement;
window.hideUserManagement = hideUserManagement;
window.showAddUserForm = showAddUserForm;
window.hideAddUserForm = hideAddUserForm;
window.addNewUser = addNewUser;
window.editUser = editUser;
window.hideEditUserForm = hideEditUserForm;
window.saveUserChanges = saveUserChanges;
window.deleteUser = deleteUser;
window.isUserRegistered = isUserRegistered;

// Inicializar el módulo cuando se carga la página
document.addEventListener('DOMContentLoaded', initUserManagement);