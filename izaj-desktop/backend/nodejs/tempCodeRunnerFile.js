// GET Products from Inventory DB and upsert into Client DB
app.get('/api/products', authenticate, async (req, res) => {
  try {
    const { after, limit = 100, sync } = req.query;

    if (!sync || sync === 'false') {
      return res.redirect('/api/products/existing');
    }

    let invQuery = productSupabase
      .from('centralized_product')
      .select(`
        id,
        product_name,
        quantity,
        price,
        status,
        category:category ( category_name ),
        branch:branch ( location )
      `)
      .order('created_at', { ascending: true })
      .limit(parseInt(limit, 10));

    if (after) invQuery = invQuery.gt('created_at', after);

    const { data: invRows, error: fetchErr } = await invQuery;
    if (fetchErr) {
      console.error('Error fetching products:', fetchErr);
      return res.status(500).json({
        error: 'Failed to fetch products',
        details: fetchErr.message
      });
    }

    if (!invRows?.length) {
      return res.json({
        success: true,
        products: [],
        synced: 0,
        skipped: 0,
        timestamp: new Date().toISOString()
      });
    }

    const rowsForClient = invRows.map((r) => ({
      product_id: r.id,
      product_name: r.product_name,
      price: r.price,
      status: r.status ?? 'active',
      category: r.category?.category_name?.trim() || null,
      branch: r.branch?.location?.trim() || null,
      is_published: false,
    }));

    const { data: upserted, error: upsertErr } = await supabase
      .from('products')
      .upsert(rowsForClient, {
        onConflict: 'product_id',
        ignoreDuplicates: false
      })
      .select();

    if (upsertErr) {
      console.error('Error inserting into client DB:', upsertErr);
      return res.status(500).json({
        error: 'Failed to insert products into client database',
        details: upsertErr.message
      });
    }

    const syncedCount = upserted ? upserted.length : rowsForClient.length;
    const timestamp = new Date().toISOString();
    const stockResults = [];

    for (const product of invRows) {
      const result = await updateProductStock(product.id, product.quantity || 0);
      stockResults.push({
        product_id: product.id,
        ...result,
        quantity: product.quantity || 0
      });
      
      console.log(`Stock ${result.action} for product ${product.id} with qty: ${product.quantity || 0}`);
    }

        const stockSuccessCount = stockResults.filter(r => r.success).length;
        const stockFailCount = stockResults.filter(r => !r.success).length;

        res.json({
          success: true,
          products: upserted,
          synced: syncedCount,
          skipped: Math.max(0, invRows.length - syncedCount),
          stock: {
            processed: stockResults.length,
            success: stockSuccessCount,
            failed: stockFailCount,
            results: stockResults
          },
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error syncing products:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to sync products',
          details: error.message
        });
      }
    });