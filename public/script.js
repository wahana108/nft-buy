console.log('script.js loaded');
const supabase = window.supabase.createClient('https://jmqwuaybvruzxddsppdh.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptcXd1YXlidnJ1enhkZHNwcGRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MTUxNzEsImV4cCI6MjA1NTk5MTE3MX0.ldNdOrsb4BWyFRwZUqIFEbmU0SgzJxiF_Z7eGZPKZJg');
let token;

async function login() {
  console.log('Login function called');
  try {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    console.log('Attempting login with:', { email, password });
    if (!email || !password) throw new Error('Email and password are required');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    if (error) throw error;
    token = data.session.access_token;
    console.log('Login successful:', { token, user_id: data.user.id });
    localStorage.setItem('authToken', token);
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('buy').style.display = 'block';
    loadNFTs();
  } catch (error) {
    console.error('Login failed:', error.message);
    alert('Login failed: ' + error.message);
  }
}

async function register() {
  console.log('Register function called');
  try {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    console.log('Attempting register with:', { email, password });
    if (!email || !password) throw new Error('Email and password are required');
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password
    });
    if (error) throw error;
    console.log('Registration successful:', data);
    const { error: insertError } = await supabase
      .from('users_registered')
      .insert({ user_id: data.user.id, email, registered_at: new Date().toISOString() });
    if (insertError) throw insertError;
    alert('Registration successful! Please login.');
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
  } catch (error) {
    console.error('Registration failed:', error.message);
    alert('Registration failed: ' + error.message);
  }
}

async function loadNFTs(searchQuery = '') {
  try {
    console.log('Loading NFTs');
    const res = await fetch('/nfts', {
      headers: { Authorization: token }
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const nfts = await res.json();
    console.log('NFTs loaded:', nfts);

    // Filter NFT berdasarkan pencarian
    const filteredNfts = searchQuery
      ? nfts.filter(nft => nft.title.toLowerCase().includes(searchQuery.toLowerCase()))
      : nfts;

    const list = document.getElementById('nft-list');
    list.innerHTML = '';
    if (filteredNfts.length === 0) {
      list.innerHTML = '<p>No NFTs available or no matches found.</p>';
    } else {
      filteredNfts.forEach(nft => {
        const div = document.createElement('div');
        div.innerHTML = `
          ${nft.image_url ? `<img src="${nft.image_url}" alt="${nft.title}" style="max-width: 100px;">` : ''}
          <h3>${nft.title}</h3>
          <p>Description: ${nft.description}</p>
          <p>Vendor: ${nft.vendor_id} | Rp${nft.price} | Contact: ${nft.vendor_email}</p>
          <button class="buy-btn" data-nft-id="${nft.id}">Buy</button>
        `;
        list.appendChild(div);
      });
      document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', () => buyNFT(btn.getAttribute('data-nft-id')));
      });
    }
  } catch (error) {
    console.error('Error loading NFTs:', error.message);
  }
}

async function buyNFT(nftId) {
  try {
    const nftData = await fetch('/nfts', { headers: { Authorization: token } })
      .then(res => res.json())
      .then(nfts => nfts.find(nft => nft.id == nftId));
    const proofUrl = prompt(`Enter proof URL for NFT ${nftId} (bought externally from ${nftData.vendor_email}):\n\nKejujuran transaksi Anda adalah wujud kontribusi komunitas. Anomali transaksi berakibat pencabutan keanggotaan permanen.`);
    if (!proofUrl) throw new Error('Proof URL is required');
    console.log('Buying NFT:', nftId);
    const res = await fetch('/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ nft_id: nftId, proof_url: proofUrl })
    });
    if (!res.ok) throw new Error(`Buy failed: ${res.status}`);
    console.log('NFT bought');
    alert('NFT bought successfully!');
    loadNFTs(document.getElementById('nft-search').value); // Reload dengan query pencarian
  } catch (error) {
    console.error('Error buying NFT:', error.message);
    alert('Error: ' + error.message);
  }
}

function logout() {
  console.log('Logout function called');
  localStorage.removeItem('authToken');
  document.getElementById('buy').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded');
  const loginButton = document.getElementById('login-btn');
  if (loginButton) {
    loginButton.addEventListener('click', login);
  }
  const logoutButton = document.getElementById('logout-btn');
  if (logoutButton) {
    logoutButton.addEventListener('click', logout);
  }
  const registerButton = document.getElementById('register-btn');
  if (registerButton) {
    registerButton.addEventListener('click', register);
  }
  const showRegisterLink = document.getElementById('show-register-link');
  if (showRegisterLink) {
    showRegisterLink.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('register-form').style.display = 'block';
    });
  }
  const showLoginLink = document.getElementById('show-login-link');
  if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('register-form').style.display = 'none';
      document.getElementById('login-form').style.display = 'block';
    });
  }

  // Event listener untuk input pencarian
  const searchInput = document.getElementById('nft-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      loadNFTs(e.target.value);
    });
  }
});