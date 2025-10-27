import React from 'react';
// Import the manual HTML as raw, then inject as innerHTML in a scrollable container
import manualHtml from '../../training_manual.html?raw';

const ManualPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <div
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        style={{ overflowY: 'auto' }}
        dangerouslySetInnerHTML={{ __html: manualHtml as unknown as string }}
      />
    </div>
  );
};

export default ManualPage;


