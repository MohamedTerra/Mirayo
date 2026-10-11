import React, { useState, useEffect, useMemo } from 'react';
import { Package, History, Plus, Minus, RotateCcw, ShoppingBag, Trash2, Edit2, TrendingUp, DollarSign } from 'lucide-react';

const API_URL = 'https://sheetdb.io/api/v1/s0nk41xn5f3ez';

export default function App() {
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('inventory');
  const [isLoading, setIsLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [actionModal, setActionModal] = useState({ isOpen: false, type: null, item: null });

  // Fetch Data from Google Sheets via SheetDB
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [inventoryRes, txRes] = await Promise.all([
        fetch(`${API_URL}?sheet=Inventory`),
        fetch(`${API_URL}?sheet=Transactions`)
      ]);
      
      const inventoryData = await inventoryRes.json();
      const txData = await txRes.json();

      // Ensure numbers are parsed correctly from strings
      setItems(inventoryData.map(item => ({
        ...item,
        Price: Number(item.Price) || 0,
        Stock: Number(item.Stock) || 0
      })));
      setTransactions(txData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newItem = {
      SKU: formData.get('sku'),
      Name: formData.get('name'),
      Category: formData.get('category'),
      Color: formData.get('color'),
      Size: formData.get('size'),
      Price: Number(formData.get('price')),
      Stock: Number(formData.get('stock')),
    };

    try {
      await fetch(`${API_URL}?sheet=Inventory`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [newItem] })
      });
      await fetchData();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const handleEditItem = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updatedFields = {
      Name: formData.get('name'),
      Category: formData.get('category'),
      Color: formData.get('color'),
      Size: formData.get('size'),
      Price: Number(formData.get('price')),
      Stock: Number(formData.get('stock')),
    };

    try {
      // Patch requires targeting the specific column to find the row
      await fetch(`${API_URL}/SKU/${editingItem.SKU}?sheet=Inventory`, {
        method: 'PATCH',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedFields })
      });
      await fetchData();
      setIsEditModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const handleDeleteItem = async (sku) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await fetch(`${API_URL}/SKU/${sku}?sheet=Inventory`, {
          method: 'DELETE',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        });
        await fetchData();
      } catch (error) {
        console.error("Error deleting item:", error);
      }
    }
  };

  const handleTransaction = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const quantity = Number(formData.get('quantity'));
    const { type, item } = actionModal;

    if (type === 'sale' && item.Stock < quantity) {
      alert("Not enough stock!");
      return;
    }

    const newStock = type === 'sale' ? item.Stock - quantity : item.Stock + quantity;
    const txTotal = item.Price * quantity;

    const newTransaction = {
      ID: Date.now().toString(),
      Date: new Date().toISOString(),
      SKU: item.SKU,
      Type: type,
      Quantity: quantity,
      TotalValue: txTotal
    };

    try {
      // 1. Update Inventory Stock
      await fetch(`${API_URL}/SKU/${item.SKU}?sheet=Inventory`, {
        method: 'PATCH',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { Stock: newStock } })
      });

      // 2. Log Transaction
      await fetch(`${API_URL}?sheet=Transactions`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [newTransaction] })
      });

      await fetchData();
      setActionModal({ isOpen: false, type: null, item: null });
    } catch (error) {
      console.error("Error processing transaction:", error);
    }
  };

  // Stats Calculations
  const stats = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      const qty = Number(tx.Quantity) || 0;
      const val = Number(tx.TotalValue) || 0;
      if (tx.Type === 'sale') {
        acc.sold += qty;
        acc.revenue += val;
      } else if (tx.Type === 'return') {
        acc.returns += qty;
        acc.revenue -= val;
      }
      return acc;
    }, { sold: 0, returns: 0, revenue: 0 });
  }, [transactions]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fbfaf8] text-[#2c3f2d]">Loading Mirayo Database...</div>;
  }

  return (
    <div className="min-h-screen bg-[#fbfaf8] text-gray-800 font-sans">
      <header className="bg-[#2c3f2d] text-[#f4efe9] py-6 shadow-md">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShoppingBag size={28} className="text-[#a4b494]" />
            <h1 className="text-3xl font-serif tracking-wide text-[#f4efe9]">Mirayo</h1>
          </div>
          
          <div className="flex bg-[#1a261a] p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'inventory' ? 'bg-[#a4b494] text-[#1a261a]' : 'text-gray-300 hover:text-white'}`}
            >
              <Package size={18} /> Inventory
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-[#a4b494] text-[#1a261a]' : 'text-gray-300 hover:text-white'}`}
            >
              <History size={18} /> Tracker
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'inventory' ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#2c3f2d]">Current Stock</h2>
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="bg-[#2c3f2d] hover:bg-[#1a261a] text-white px-5 py-2.5 rounded-lg flex items-center gap-2 transition-colors font-medium shadow-sm"
              >
                <Plus size={18} /> Add New Model
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-[#e2d5c8] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f4efe9] border-b border-[#e2d5c8] text-[#2c3f2d]">
                    <th className="px-6 py-4 font-semibold text-sm uppercase">SKU</th>
                    <th className="px-6 py-4 font-semibold text-sm uppercase">Item Name</th>
                    <th className="px-6 py-4 font-semibold text-sm uppercase">Details</th>
                    <th className="px-6 py-4 font-semibold text-sm uppercase">Price</th>
                    <th className="px-6 py-4 font-semibold text-sm uppercase">Stock</th>
                    <th className="px-6 py-4 font-semibold text-sm uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2d5c8]">
                  {items.map((item) => (
                    <tr key={item.SKU} className="hover:bg-[#fbfaf8] transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">{item.SKU}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{item.Name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.Category} • {item.Color} • Size {item.Size}
                      </td>
                      <td className="px-6 py-4 font-medium text-[#2c3f2d]">${item.Price.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${item.Stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>
                          {item.Stock} units
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setActionModal({ isOpen: true, type: 'sale', item })} className="p-2 bg-[#f4efe9] text-[#2c3f2d] hover:bg-[#a4b494] hover:text-white rounded-lg transition-colors" title="Log Sale">
                            <Minus size={16} />
                          </button>
                          <button onClick={() => setActionModal({ isOpen: true, type: 'return', item })} className="p-2 bg-[#f4efe9] text-[#2c3f2d] hover:bg-[#a4b494] hover:text-white rounded-lg transition-colors" title="Log Return">
                            <RotateCcw size={16} />
                          </button>
                          <button onClick={() => { setEditingItem(item); setIsEditModalOpen(true); }} className="p-2 text-gray-500 hover:text-blue-600 transition-colors" title="Edit">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteItem(item.SKU)} className="p-2 text-gray-500 hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No items in inventory. Add a new model to start.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl border border-[#e2d5c8] shadow-sm flex items-center gap-4">
                <div className="p-4 bg-green-100 text-green-700 rounded-full"><TrendingUp size={24} /></div>
                <div><p className="text-sm text-gray-500 font-medium">Items Sold</p><p className="text-2xl font-bold text-gray-900">{stats.sold}</p></div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-[#e2d5c8] shadow-sm flex items-center gap-4">
                <div className="p-4 bg-blue-100 text-blue-700 rounded-full"><DollarSign size={24} /></div>
                <div><p className="text-sm text-gray-500 font-medium">Net Revenue</p><p className="text-2xl font-bold text-gray-900">${stats.revenue.toFixed(2)}</p></div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-[#e2d5c8] shadow-sm flex items-center gap-4">
                <div className="p-4 bg-orange-100 text-orange-700 rounded-full"><RotateCcw size={24} /></div>
                <div><p className="text-sm text-gray-500 font-medium">Items Returned</p><p className="text-2xl font-bold text-gray-900">{stats.returns}</p></div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-[#2c3f2d] mb-6">Recent Transactions</h2>
            <div className="bg-white rounded-xl shadow-sm border border-[#e2d5c8] overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f4efe9] border-b border-[#e2d5c8] text-[#2c3f2d]">
                    <th className="px-6 py-4 font-semibold text-sm uppercase">Date</th>
                    <th className="px-6 py-4 font-semibold text-sm uppercase">Type</th>
                    <th className="px-6 py-4 font-semibold text-sm uppercase">SKU</th>
                    <th className="px-6 py-4 font-semibold text-sm uppercase text-right">Quantity</th>
                    <th className="px-6 py-4 font-semibold text-sm uppercase text-right">Total Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2d5c8]">
                  {transactions.slice().reverse().map((tx) => (
                    <tr key={tx.ID} className="hover:bg-[#fbfaf8]">
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(tx.Date).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase ${tx.Type === 'sale' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                          {tx.Type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-500">{tx.SKU}</td>
                      <td className={`px-6 py-4 text-right font-bold ${tx.Type === 'sale' ? 'text-green-600' : 'text-orange-500'}`}>
                        {tx.Type === 'sale' ? '-' : '+'}{tx.Quantity}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        ${Number(tx.TotalValue).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No transactions recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modals for Add, Edit, and Action (Sale/Return) go here - keeping them simple for standard HTML forms */}
      
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-[#2c3f2d] px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#f4efe9]">{isEditModalOpen ? 'Edit Item' : 'Add New Model'}</h3>
              <button onClick={() => {setIsAddModalOpen(false); setIsEditModalOpen(false);}} className="text-[#a4b494] hover:text-white"><Trash2 size={20}/></button>
            </div>
            <form onSubmit={isEditModalOpen ? handleEditItem : handleAddItem} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">SKU (Unique ID)</label>
              <input name="sku" defaultValue={editingItem?.SKU} readOnly={isEditModalOpen} required className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg" /></div>
              
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
              <input name="name" defaultValue={editingItem?.Name} required className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg" /></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input name="category" defaultValue={editingItem?.Category} required className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input name="color" defaultValue={editingItem?.Color} required className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg" /></div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                <input name="size" defaultValue={editingItem?.Size} required className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                <input name="price" type="number" step="0.01" defaultValue={editingItem?.Price} required className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock Qty</label>
                <input name="stock" type="number" defaultValue={editingItem?.Stock} required className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg" /></div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => {setIsAddModalOpen(false); setIsEditModalOpen(false);}} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-[#2c3f2d] text-white rounded-lg hover:bg-[#1a261a]">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {actionModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className={`px-6 py-4 flex justify-between items-center ${actionModal.type === 'sale' ? 'bg-green-600' : 'bg-orange-500'}`}>
              <h3 className="text-lg font-bold text-white">Log {actionModal.type === 'sale' ? 'Sale' : 'Return'}</h3>
            </div>
            <form onSubmit={handleTransaction} className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-500">Item: <span className="font-bold text-gray-800">{actionModal.item.Name} ({actionModal.item.SKU})</span></p>
                <p className="text-sm text-gray-500">Current Stock: <span className="font-bold text-gray-800">{actionModal.item.Stock}</span></p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity {actionModal.type === 'sale' ? 'Sold' : 'Returned'}</label>
                <input name="quantity" type="number" min="1" max={actionModal.type === 'sale' ? actionModal.item.Stock : undefined} required className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-lg font-bold text-center" defaultValue="1" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setActionModal({ isOpen: false, type: null, item: null })} className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
                <button type="submit" className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium ${actionModal.type === 'sale' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}>Confirm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}