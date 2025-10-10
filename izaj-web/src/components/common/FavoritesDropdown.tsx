import { useState, useRef, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { useFavoritesContext } from '../../context/FavoritesContext';

interface User {
  firstName: string;
  lastName: string;
  email: string;
}

interface FavoritesDropdownProps {
  user: User | null;
  onOpenAuthModal: () => void;
}

export default function FavoritesDropdown({ user, onOpenAuthModal }: FavoritesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { favorites, removeFavorite } = useFavoritesContext();

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-black hover:text-orange-500 transition-colors duration-200"
        aria-label="Favorites"
      >
        <Icon icon="mdi:heart-outline" className="w-7 h-7 translate-y-1" />
        {user && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
            {favorites.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-100 transform transition-all duration-300 ease-out origin-top-right">
          <div className="py-3 px-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Icon icon="mdi:heart-outline" className="w-5 h-5 text-orange-500" />
              My Favorites
            </h3>
            {user && favorites.length > 0 && (
              <Link 
                href="/favorites" 
                className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors duration-200 flex items-center gap-1"
                onClick={() => setIsOpen(false)}
              >
                <Icon icon="mdi:arrow-right" className="w-4 h-4" />
                View All
              </Link>
            )}
          </div>

          <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
            {user ? (
              favorites.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {favorites.map((item) => (
                    <div
                      key={item.productId}
                      className="px-5 py-4 hover:bg-gray-50 transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 rounded-xl overflow-hidden ring-1 ring-gray-100 group-hover:ring-orange-200 transition-all duration-200">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                            />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/item-description/${item.productId}`}
                            className="text-sm text-gray-800 font-medium hover:text-orange-500 transition-colors duration-200 block"
                          >
                            {item.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1.5">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Icon icon="mdi:lightbulb-outline" className="w-3.5 h-3.5" />
                              Lighting Fixture
                            </p>
                            <button onClick={() => removeFavorite(item.productId)} className="text-orange-500 hover:text-orange-600 transition-colors duration-200">
                              <Icon icon="mdi:heart" className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="bg-gray-50 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4">
                    <Icon icon="mdi:heart-off-outline" className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No favorite items yet</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    Start adding your favorite lighting fixtures to keep track of items you love
                  </p>
                </div>
              )
            ) : (
              <div className="py-10 px-8 text-center bg-gradient-to-b from-gray-50 to-white">
                <div className="relative">
                  <div className="absolute inset-0 bg-orange-100 rounded-full blur-xl opacity-50"></div>
                  <div className="relative bg-orange-50 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-6">
                    <Icon icon="mdi:account-alert-outline" className="h-12 w-12 text-orange-500" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">Sign in to view favorites</h3>
                <p className="text-gray-600 mb-8 max-w-sm mx-auto leading-relaxed">
                  Save your favorite lighting fixtures and keep track of items you love by signing in to your account
                </p>
                <button 
                  className="group inline-flex items-center px-8 py-3.5 bg-black text-white rounded-xl hover:bg-orange-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium text-sm"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenAuthModal();
                  }}
                >
                  <Icon icon="mdi:login" className="w-5 h-5 mr-2.5 group-hover:rotate-12 transition-transform duration-300" />
                  Sign in now
                </button>
                <p className="mt-4 text-xs text-gray-500">
                  Don't have an account?{' '}
                  <button 
                    onClick={() => {
                      setIsOpen(false);
                      onOpenAuthModal();
                    }}
                    className="text-orange-500 hover:text-orange-600 font-medium underline-offset-2 hover:underline"
                  >
                    Create one
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
