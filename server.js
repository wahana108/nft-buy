const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const supabaseUrl = 'https://oqquvpjikdbjlagdlbhp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xcXV2cGppa2RiamxhZ2RsYmhwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk1MTgwOCwiZXhwIjoyMDYwNTI3ODA4fQ.cJri-wLQcDod3J49fUKesAY2cnghU3jtlD4BiuYMelw'; // Pastikan benar
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

app.use(express.json());
app.use(express.static('public'));

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization;
  console.log('Auth token:', token);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    console.error('Auth error:', error?.message);
    return res.status(401).send('Unauthorized');
  }
  console.log('Authenticated user:', user.id, user.email);
  req.user = user;
  next();
};

app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Registering user:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });
    if (error) {
      console.error('Auth signup error:', error.message);
      throw error;
    }
    const user = data.user;
    console.log('User registered in auth:', user.id, user.email);
    const { data: userData, error: userError } = await supabase
      .from('users_registered')
      .insert({ user_id: user.id, email: user.email, registered_at: new Date().toISOString() })
      .select();
    if (userError) {
      console.error('Insert user_registered error:', userError.message);
      throw userError;
    }
    const { error: userSyncError } = await supabase
      .from('users')
      .insert({ id: user.id, email: user.email, created_at: new Date().toISOString() });
    if (userSyncError) {
      console.error('Insert users error:', userSyncError.message);
      throw userSyncError;
    }
    console.log('User added to users and users_registered:', userData);
    res.json({ message: 'Registration successful', user });
  } catch (error) {
    console.error('Registration failed:', error.message);
    res.status(500).send(error.message);
  }
});

app.get('/nfts', authenticate, async (req, res) => {
  try {
    console.log('Fetching NFTs');
    const { data: nfts, error } = await supabase
      .from('nfts')
      .select('id, title, vendor_id, price, image_url, description')
      .eq('price', 100000);
    if (error) throw error;
    const nftsWithContact = await Promise.all(nfts.map(async nft => {
      const { data: vendor } = await supabase
        .from('users')
        .select('email')
        .eq('id', nft.vendor_id)
        .single();
      const [desc, contact] = nft.description ? nft.description.split(' | ') : ['', vendor?.email || 'Contact not available'];
      return {
        ...nft,
        description: desc || 'No description',
        vendor_email: contact || vendor?.email || 'Contact not available'
      };
    }));
    console.log('NFTs fetched:', nftsWithContact);
    res.json(nftsWithContact);
  } catch (error) {
    console.error('Error fetching NFTs:', error.message);
    res.status(500).send(error.message);
  }
});

app.post('/buy', authenticate, async (req, res) => {
  try {
    const { nft_id, proof_url } = req.body;
    console.log('Recording buy for NFT:', nft_id, 'by user:', req.user.id);
    const { data: nftData, error: nftError } = await supabase
      .from('nfts')
      .select('vendor_id')
      .eq('id', nft_id)
      .single();
    if (nftError) {
      console.error('NFT fetch error:', nftError.message);
      throw nftError;
    }
    console.log('NFT found, vendor_id:', nftData.vendor_id);
    const transactionData = {
      nft_id,
      seller_id: nftData.vendor_id,
      buyer_id: req.user.id,
      amount: 100000,
      proof_url,
      status: 'completed',
      created_at: new Date().toISOString()
    };
    console.log('Inserting transaction:', transactionData);
    const { error } = await supabase
      .from('transactions')
      .insert(transactionData);
    if (error) {
      console.error('Transaction insert error:', error.message);
      throw error;
    }
    console.log('Buy recorded successfully');
    res.send('Buy recorded');
  } catch (error) {
    console.error('Error recording buy:', error.message);
    res.status(500).send(error.message);
  }
});

app.get('/', (req, res) => {
  console.log('Serving index.html from public');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
