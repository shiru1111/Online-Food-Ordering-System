let selectedRestaurantId = null;
let selectedMenuItems = [];
let selectedItems = [];
let userEmail = '';
let userLevel = 1; // default user level

async function login() {
  userEmail = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!userEmail || !password) {
    alert("Please enter your email and password to continue.");
    return;
  }

  const res = await fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: userEmail, password })
  });

  if (res.ok) {
    const data = await res.json();
    userLevel = data.level; // 👈 get user level from server

    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('restaurantSection').style.display = 'block';
    displayUserEmail();
    loadRestaurants();
    loadOrders();

    if (userLevel === 2) {
      alert("Welcome Admin!  ");
      document.getElementById('adminSection').style.display = 'block';
      loadRestaurantDropdown();
    }
  } else {
    alert("Login failed. Please check your email or password.");
  }
}



async function loadRestaurants() {
  try {
    const res = await fetch('http://localhost:3000/restaurants');
    const restaurants = await res.json();
    const list = document.getElementById('restaurantList');
    list.innerHTML = '';

    restaurants.forEach(r => {
      const li = document.createElement('li');
      const restaurantName = document.createElement('span');
      restaurantName.textContent = r.name;

      if (userLevel === 2) {
        // Admin view: include ID in name
        restaurantName.textContent = `[ID: ${r.id}] ${r.name}`;

        // Delete button for admins
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.marginLeft = '10px';

        deleteBtn.onclick = async (e) => {
          e.stopPropagation(); // Prevent triggering menu load

          const confirmed = confirm('Are you sure you want to delete this restaurant?');
          if (!confirmed) return;

          try {
            const res = await fetch(`http://localhost:3000/restaurants/${r.id}`, {
              method: 'DELETE'
            });

            const contentType = res.headers.get("content-type");

            if (res.ok) {
              alert('Restaurant deleted successfully.');
              loadRestaurants();
            } else {
              if (contentType && contentType.includes("application/json")) {
                const data = await res.json();
                alert(data.message || 'Successfully Deleted');
                loadRestaurants();
              } else {
                const errorText = await res.text();
                console.error('Unexpected non-JSON response:', errorText);
                alert('Successfully Deleted');
                loadRestaurants();
              }
            }
          } catch (err) {
            console.error('Delete failed:', err);
            alert('An error occurred while deleting the restaurant.');
          }
        };

        li.appendChild(restaurantName);
        li.appendChild(deleteBtn);
      } else {
        // Normal user view
        li.appendChild(restaurantName);
      }

      // Click to load menu
      li.onclick = () => loadMenu(r.id);

      list.appendChild(li);
    });
  } catch (err) {
    console.error('Failed to load restaurants:', err);
    alert('Could not load restaurant list.');
  }
}

async function loadMenu(id) {
  selectedRestaurantId = id;
  selectedMenuItems = [];
  document.getElementById('menuSection').style.display = 'block';
  const res = await fetch(`http://localhost:3000/menu/${id}`);
  const menu = await res.json();
  const list = document.getElementById('menuList');
  list.innerHTML = '';

  menu.forEach(m => {
    const li = document.createElement('li');

    if (userLevel === 2) {
      // Admin view
      li.innerHTML = `
        <label>
          <input type="checkbox" value="${m.id}" data-price="${m.price}" data-name="${m.name}" onchange="toggleMenuItem(this)">
          [ID: ${m.id}] ${m.name} - ₱${m.price}
        </label>
        <input type="number" value="1" min="1" style="width: 50px;" disabled onchange="updateItemQuantity(this, ${m.id})">
      `;

      // Add Delete Button for each menu item (for Admin)
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.style.marginLeft = '10px';
      deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        const confirmed = confirm('Are you sure you want to delete this menu item?');
        if (!confirmed) return;

        try {
          const res = await fetch(`http://localhost:3000/menu/${m.id}`, {
            method: 'DELETE'
          });

          if (res.ok) {
            alert('Menu item deleted successfully.');
            loadMenu(id); // Refresh menu list after deletion
          } else {
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const data = await res.json();
              alert(data.message || 'Failed to delete menu item.');
            } else {
              const errorText = await res.text();
              console.error('Unexpected non-JSON response:', errorText);
              alert('Failed to delete menu item.');
            }
          }
        } catch (error) {
          console.error('Fetch error:', error);
          alert('An error occurred while deleting the menu item.');
        }
      };

      li.appendChild(deleteBtn);
    } else {
      // Normal user view
      li.innerHTML = `
        <label>
          <input type="checkbox" value="${m.id}" data-price="${m.price}" data-name="${m.name}" onchange="toggleMenuItem(this)">
          ${m.name} - ₱${m.price}
        </label>
        <input type="number" value="1" min="1" style="width: 50px;" disabled onchange="updateItemQuantity(this, ${m.id})">
      `;
    }

    list.appendChild(li);
  });
}




function toggleMenuItem(checkbox) {
  const id = parseInt(checkbox.value);
  const price = parseFloat(checkbox.getAttribute('data-price'));
  const name = checkbox.getAttribute('data-name');
  // Get item name from the label
  const quantityInput = checkbox.parentElement.nextElementSibling;

  if (checkbox.checked) {
    selectedMenuItems.push({ id, name, price, quantity: 1 });  // Ensure name is included
    quantityInput.disabled = false;
  } else {
    selectedMenuItems = selectedMenuItems.filter(item => item.id !== id);
    quantityInput.disabled = true;
    quantityInput.value = 1;
  }

  updateTotalCost();
}



function updateTotalCost() {
  const total = selectedMenuItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('totalCost').textContent = `Total: ₱${total.toFixed(2)}`;
}




async function placeOrder() {
if (selectedMenuItems.length === 0) {
alert("Please select at least one item from the menu before placing an order.");
return; // Stop the order placement if no items are selected
}

const name = document.getElementById('customerName').value.trim();
const payment = document.getElementById('paymentMethod').value;
const accountNumber = document.getElementById('accountNumber').value.trim();

// Address fields (only for COD)
const houseNumber = document.getElementById('houseNumber').value.trim();
const city = document.getElementById('city').value.trim();
const province = document.getElementById('province').value.trim();
const postalCode = document.getElementById('postalCode').value.trim();
const additionalAddress = document.getElementById('additionalAddress').value.trim();

// Check if name and payment method are filled
if (!name || !payment) {
alert("Please enter your name and select a payment method.");
return;
}

// Validation for account number (for specific methods)
if ((payment === 'GCash' || payment === 'Paymaya' || payment === 'BankAccount' || payment === 'Paypal') && !accountNumber) {
alert("Please enter your account number.");
return;
}

// Validation for address (for Cash On Delivery)
if (payment === 'COD' && (!houseNumber || !city || !province || !postalCode)) {
alert("Please complete your address details.");
return;
}

// Show confirmation modal
document.getElementById('confirmName').textContent = name;
document.getElementById('confirmAddress').textContent = `${houseNumber}, ${city}, ${province}, ${postalCode} ${additionalAddress ? ', ' + additionalAddress : ''}`;

// Show items and total in modal
const itemsText = selectedMenuItems.map(item => `${item.name} (x${item.quantity}) - ₱${(item.price * item.quantity).toFixed(2)}`).join(', ');
const total = selectedMenuItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
document.getElementById('confirmItems').textContent = itemsText;
document.getElementById('confirmTotal').textContent = total;

// Show the modal
document.getElementById('confirmationModal').style.display = 'block';

// Handle confirmation
document.getElementById('confirmOrderBtn').onclick = async () => {
// Send the order data with all necessary details (including address/account number)
const res = await fetch('http://localhost:3000/order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: userEmail,
    restaurantId: selectedRestaurantId,
    menuItems: selectedMenuItems,
    menuIds: selectedMenuItems.map(item => item.id),
    customerName: name,
    paymentMethod: payment,
    accountNumber: accountNumber, // Account number (for certain payments)
    houseNumber: houseNumber,     // Address details (for COD)
    city: city,
    province: province,
    postalCode: postalCode,
    additionalAddress: additionalAddress
  })
});

if (res.ok) {
  alert('Order placed!');
  loadOrders(); // Reload the orders list after placing the order
  
  // ✅ Reset form and selection here
  document.getElementById('customerName').value = '';
  document.getElementById('paymentMethod').value = '';
  document.getElementById('accountNumber').value = '';
  document.getElementById('houseNumber').value = '';
  document.getElementById('city').value = '';
  document.getElementById('province').value = '';
  document.getElementById('postalCode').value = '';
  document.getElementById('additionalAddress').value = '';
  togglePaymentInput(); // Re-hide account/address input section

  selectedMenuItems = [];

  // ✅ Reload the menu so checkboxes are reset
  const currentRestaurantName = document.getElementById('selectedRestaurantName').textContent.replace('Restaurant: ', '');
  loadMenu(selectedRestaurantId, currentRestaurantName);

  // ✅ Hide confirmation modals
  document.getElementById('confirmationModal').style.display = 'none'; // Hide modal after order is confirmed
} else {
  alert('Failed to place order.');
  document.getElementById('confirmationModal').style.display = 'none'; // Hide modal on failure
}
};

// Handle cancel
document.getElementById('cancelOrderBtn').onclick = () => {
document.getElementById('confirmationModal').style.display = 'none'; // Hide the modal on cancel
};
}

async function loadOrders() {
document.getElementById('ordersSection').style.display = 'block';
const res = await fetch(`http://localhost:3000/orders/${userEmail}`);
const orders = await res.json();
const list = document.getElementById('ordersList');
list.innerHTML = '';

orders.forEach(o => {
const div = document.createElement('div');
div.classList.add('order-item');  // For styling

const itemsText = o.items || '';
const totalPrice = isNaN(o.total) ? '₱0.00' : parseFloat(o.total).toFixed(2);

// Check if payment method is online (Paypal, GCash, Paymaya, BankAccount)
const isOnlinePayment = ['Paypal', 'GCash', 'Paymaya', 'BankAccount'].includes(o.payment_method);
const addressText = `${o.house_number}, ${o.city}, ${o.province}, ${o.postal_code}${o.additional_address ? ', ' + o.additional_address : ''}`;

// Always show Account Number and Delivery Address, even for online payments
const accountAndAddress = ` 
  <p><strong>Account Number:</strong> ${o.account_number || 'N/A'}</p>
  <p><strong>Delivery Address:</strong> ${addressText}</p>
`;

div.innerHTML = `
  <p><strong>Name:</strong> ${o.customer_name || 'N/A'}</p>
  <p><strong>Payment Method:</strong> ${o.payment_method || 'N/A'}</p>
  ${accountAndAddress} <!-- Show both Account Number and Delivery Address -->
  <p><strong>Orders:</strong> ${itemsText}</p>
  <p><strong>Total Price:</strong> ₱${totalPrice}</p>
  <p><strong>Status:</strong> ${o.status}</p>
  <p><strong>Tracking ID:</strong> ${o.tracking_id}</p>
`;

// Button for "Order Received"
if (o.status === 'Pending') {
  const btnReceived = document.createElement('button');
  btnReceived.textContent = 'Order Received';
  btnReceived.onclick = () => markAsReceived(o.id);
  div.appendChild(btnReceived);
}

// Button for "Delete Order" when status is "Delivered"
if (o.status === 'Delivered') {
  const btnDelete = document.createElement('button');
  btnDelete.textContent = 'Delete Order';
  btnDelete.onclick = () => deleteOrder(o.id);
  div.appendChild(btnDelete);
}

list.appendChild(div);
});
}



async function markAsReceived(orderId) {
try {
const res = await fetch(`http://localhost:3000/orders/${orderId}/received`, {
  method: 'POST',
});

if (res.ok) {
  alert('Order marked as received');
  loadOrders(); // Reload orders after status update
} else {
  throw new Error('Failed to update order status');
}
} catch (err) {
alert('Failed to update order status');
console.error(err);
}
}

function logout() {
userLevel = 0; 
sessionStorage.removeItem('userLevel');
userEmail = '';
selectedRestaurantId = null;
selectedMenuItems = [];
window.location.reload();

document.getElementById('email').value = '';
document.getElementById('loginSection').style.display = 'block';
document.getElementById('restaurantSection').style.display = 'none';
document.getElementById('menuSection').style.display = 'none';
document.getElementById('ordersSection').style.display = 'none';
}

function togglePaymentInput() {
const method = document.getElementById('paymentMethod').value;
const accountInput = document.getElementById('accountInput');
const addressInput = document.getElementById('addressInput');

// Always show the address input regardless of payment method
addressInput.style.display = 'block';

// Only show account number input for online payment methods
if (['GCash', 'Paymaya', 'BankAccount', 'Paypal'].includes(method)) {
accountInput.style.display = 'block';
} else {
accountInput.style.display = 'none';
}
}


function updateItemQuantity(input, id) {
const quantity = parseInt(input.value);
const item = selectedMenuItems.find(i => i.id === id);
if (item && quantity > 0) {
item.quantity = quantity;
updateTotalCost();
}
}

async function deleteOrder(orderId) {
try {
const res = await fetch(`http://localhost:3000/orders/${orderId}`, {
  method: 'DELETE',
});

if (res.ok) {
  alert('Order deleted');
  loadOrders(); // Reload orders after deletion
} else {
  throw new Error('Failed to delete order');
}
} catch (err) {
alert('Failed to delete order');
console.error(err);
}
}
// Function to display the user's email
function displayUserEmail() {
  const displayDiv = document.getElementById('userEmailText');
  if (displayDiv && userEmail) {
    displayDiv.textContent = `Logged in as: ${userEmail}`;
  }
}

  
// Example after successful login:
async function loginUser() {
const email = document.getElementById('email').value.trim();
if (!email) {
alert("Please enter an email.");
return;
}

const res = await fetch('http://localhost:3000/login', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ email })
});

if (res.ok) {
userEmail = email; // Store email in global variable
document.getElementById('loginSection').style.display = 'none';
document.getElementById('restaurantSection').style.display = 'block';
displayUserEmail(); // Call the display function
loadRestaurants();
} else {
alert('Login failed');
}
}

function displayRestaurants(restaurants) {
  const list = document.getElementById('restaurantList');
  list.innerHTML = '';

  restaurants.forEach(restaurant => {
    const li = document.createElement('li');
    li.className = 'restaurant-card';
    li.innerHTML = `<h3>${restaurant.name}</h3>`;
    
    // ✅ Ensure both ID and name are passed
    li.onclick = () => loadMenu(restaurant.id, restaurant.name);

    list.appendChild(li);
  });
}

//ADMINNNNNNNNNNNNNNNNNNNNN
async function loadRestaurantDropdown() {
  const res = await fetch('http://localhost:3000/restaurants');
  const restaurants = await res.json();
  const select = document.getElementById('restaurantSelect');
  select.innerHTML = '';
  restaurants.forEach(r => {
    const option = document.createElement('option');
    option.value = r.id;
    option.textContent = r.name;
    select.appendChild(option);
  });
}

async function addRestaurant() {
  const name = document.getElementById('newRestaurantName').value.trim();
  if (!name) return alert("Enter a restaurant name.");
  await fetch('http://localhost:3000/admin/restaurant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  alert('Restaurant added.');
  loadRestaurants();
  loadRestaurantDropdown();
}

async function addMenuItem() {
  const restaurantId = document.getElementById('restaurantSelect').value;
  const name = document.getElementById('newMenuItemName').value.trim();
  const price = parseFloat(document.getElementById('newMenuItemPrice').value);

  if (!name || isNaN(price)) return alert("Fill all fields correctly.");

  await fetch('http://localhost:3000/admin/menu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurantId, name, price })
  });
  alert('Menu item added.');
  loadMenu(selectedRestaurantId);
}

async function updateMenuPrice() {
  const id = document.getElementById('menuItemId').value;
  const price = document.getElementById('newPrice').value;
  await fetch(`http://localhost:3000/admin/menu/${id}/price`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price })
  });
  alert('Menu price updated.');
  loadMenu(selectedRestaurantId);
}

async function deleteMenuItem() {
  const id = document.getElementById('deleteMenuId').value;
  await fetch(`http://localhost:3000/admin/menu/${id}`, {
    method: 'DELETE'
  });
  alert('Menu item deleted.');
}

async function deleteRestaurant() {
  const id = document.getElementById('deleteRestaurantId').value;
  await fetch(`http://localhost:3000/admin/restaurant/${id}`, {
    method: 'DELETE'
  });
  alert('Restaurant deleted.');
}
function showOrderConfirmation() {
  // Set name and address
  document.getElementById('confirmName').innerText = document.getElementById('nameInput').value;
  document.getElementById('confirmAddress').innerText = document.getElementById('addressInput').value;

  // Build items list
  let itemsText = '';
  selectedItems.forEach(item => {
    if (item.name) {
      itemsText += `${item.name} (x${item.quantity}) - ₱${item.price * item.quantity}, `;
    }
  });
  itemsText = itemsText.slice(0, -2); // remove last comma and space

  document.getElementById('confirmItems').innerText = itemsText;

  // Set total
  let total = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  document.getElementById('confirmTotal').innerText = total.toFixed(2);

  // Show modal
  document.getElementById('confirmationModal').style.display = 'block';
}


function addItem(menuItemId, quantity) {
  // Find the menu item details (especially NAME)
  const menuItem = menuItems.find(item => item.id === menuItemId);

  if (menuItem) {
    selectedItems.push({
      id: menuItem.id,
      name: menuItem.name,
      name: item.name, // IMPORTANT: Save name here!
      price: menuItem.price,
      quantity: quantity
    });
  }
}
async function deleteRestaurant(restaurantId) {
  if (confirm("Are you sure you want to delete this restaurant?")) {
    try {
      const response = await fetch(`http://localhost:3000/restaurants/${restaurantId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the restaurant from the DOM
        const restaurantItem = document.getElementById(`restaurant-${restaurantId}`);
        restaurantItem.remove();

        alert("Restaurant deleted successfully!");
      } else {
        const errorData = await response.json();
        alert(`Failed to delete restaurant: ${errorData.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting restaurant');
    }
  }
}

// Function to filter restaurants
function filterRestaurants() {
  const searchInput = document.getElementById('restaurantSearch').value.toLowerCase();
  const restaurants = document.querySelectorAll('#restaurantList li');
  
  restaurants.forEach(restaurant => {
    const restaurantName = restaurant.textContent.toLowerCase();
    if (restaurantName.includes(searchInput)) {
      restaurant.style.display = 'list-item';
    } else {
      restaurant.style.display = 'none';
    }
  });
}

// Function to filter menu items
function filterMenuItems() {
  const searchInput = document.getElementById('menuSearch').value.toLowerCase();
  const menuItems = document.querySelectorAll('#menuList li');
  
  menuItems.forEach(menuItem => {
    const menuItemName = menuItem.textContent.toLowerCase();
    if (menuItemName.includes(searchInput)) {
      menuItem.style.display = 'list-item';
    } else {
      menuItem.style.display = 'none';
    }
  });
}

// Function to open the guide modal
function openGuideModal() {
  document.getElementById('guideModal').style.display = 'block';
}

// Function to close the guide modal
function closeGuideModal() {
  document.getElementById('guideModal').style.display = 'none';
}



function calculateTotal(items) {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}







