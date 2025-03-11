const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const supabaseUrl = 'https://jmqwuaybvruzxddsppdh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptcXd1YXlidnJ1enhkZHNwcGRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MTUxNzEsImV4cCI6MjA1NTk5MTE3MX0.ldNdOrsb4BWyFRwZUqIFEbmU0SgzJxiF_Z7eGZPKZJg';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).send('Unauthorized');
  req.user = user;
  next();
};

app.get('/nfts', authenticate, async (req, res) => {
  try {
    console.log('Fetching NFTs');
    const { data: nfts, error } = await supabase
      .from('nfts')
      .select('id, title, vendor_id, price, image_url, description');
    if (error) throw error;
    const nftsWithContact = nfts.map(nft => {
      const [desc, contact] = nft.description ? nft.description.split(' | ') : ['', 'Contact not available'];
      return {
        ...nft,
        description: desc || 'No description',
        vendor_email: contact || 'Contact not available'
      };
    });
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
    console.log('Recording buy for NFT:', nft_id);
    const { data: nftData, error: nftError } = await supabase
      .from('nfts')
      .select('vendor_id')
      .eq('id', nft_id)
      .single();
    if (nftError) throw nftError;

    const { error } = await supabase
      .from('transactions')
      .insert({
        nft_id,
        seller_id: nftData.vendor_id,
        buyer_id: req.user.id,
        amount: 100000,
        proof_url,
        status: 'completed',
        created_at: new Date().toISOString()
      });
    if (error) throw error;
    console.log('Buy recorded');
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
