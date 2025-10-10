"use client";

import React from 'react';
import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';

interface CookieSettingsModalProps {
  showModal: boolean;
  onClose: () => void;
}

const CookieSettingsModal: React.FC<Partial<CookieSettingsModalProps>> = ({ showModal = true, onClose }) => {
  const router = useRouter();
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };
  if (!showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600/20 backdrop-blur-[1px] z-50 flex items-start justify-start" onClick={handleClose}>
      <div className="relative w-[360px] sm:w-[400px] md:w-[420px] bg-white h-screen shadow-xl rounded-none overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button onClick={handleClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100">
          <Icon icon="mdi:close" width="24" height="24" className="text-gray-700" />
        </button>

        <div className="p-6 mt-6">
          <h2 className="text-2xl font-bold mb-4">Cookie Preferences</h2>
          <p className="text-gray-600 text-sm mb-6">
            When you visit any website, it may store or retrieve information
            on your browser, mostly in the form of cookies. This information
            might be about you, your preferences or your device and is
            mostly used to make the site work as you expect it to. The
            information does not usually directly identify you, but it can give
            you a more personalised web experience. Because we respect
            your right to privacy, you can choose not to allow some types of
            cookies. Click on the different category headings to find out
            more and change our default settings. However, blocking some
            types of cookies may impact your experience of the site and the
            services we are able to offer.
          </p>
          <a href="#" className="text-blue-600 hover:underline text-sm">More information</a>

          <h3 className="font-bold text-xl mb-4 mt-8">Manage Cookie Settings</h3>

          {/* Cookie Categories */}
          <div className="border-t border-gray-200 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:plus" width="20" height="20" className="text-gray-700" />
              <span className="font-semibold">Strictly Necessary Cookies</span>
            </div>
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
              <Icon icon="mdi:check-circle" width="20" height="20" className="text-blue-600" />
              Always Active
            </div>
          </div>

          <div className="border-t border-gray-200 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:plus" width="20" height="20" className="text-gray-700" />
              <span className="font-semibold">Performance Cookies</span>
            </div>
            {/* Toggle Placeholder */}
            <Icon icon="mdi:toggle-right" width="40" height="24" className="text-blue-600" />
          </div>

          <div className="border-t border-gray-200 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:plus" width="20" height="20" className="text-gray-700" />
              <span className="font-semibold">Functional Cookies</span>
            </div>
            {/* Toggle Placeholder */}
             <Icon icon="mdi:toggle-right" width="40" height="24" className="text-blue-600" />
          </div>

          <div className="border-t border-b border-gray-200 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon icon="mdi:plus" width="20" height="20" className="text-gray-700" />
              <span className="font-semibold">Targeting Cookies</span>
            </div>
            {/* Toggle Placeholder */}
             <Icon icon="mdi:toggle-right" width="40" height="24" className="text-blue-600" />
          </div>

          {/* Buttons */}
          <div className="mt-8 flex flex-col gap-4">
            <button className="bg-black text-white font-semibold rounded-md px-4 py-3 hover:bg-gray-800 transition-colors">
              Only Necessary Cookies
            </button>
            <button className="bg-white text-black font-semibold rounded-md px-4 py-3 border border-gray-300 hover:bg-gray-100 transition-colors">
              Confirm My Choices
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieSettingsModal;


