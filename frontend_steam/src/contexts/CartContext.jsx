import React, { createContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (game) => {
    setCartItems(prev => {
      const exists = prev.find(item => item.id === game.id);
      if (exists) {
        toast.error('Game already in cart');
        return prev;
      }
      toast.success(`${game.title} added to cart`);
      return [...prev, game];
    });
  };

  const removeFromCart = (gameId) => {
    setCartItems(prev => prev.filter(item => item.id !== gameId));
    toast.success('Removed from cart');
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + parseFloat(item.final_price || item.price), 0);
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      clearCart,
      getCartTotal,
      cartCount: cartItems.length
    }}>
      {children}
    </CartContext.Provider>
  );
};