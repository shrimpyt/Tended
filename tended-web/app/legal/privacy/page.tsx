import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose dark:prose-invert">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <h2>1. Introduction</h2>
        <p>Welcome to Tended. We respect your privacy and are committed to protecting your personal data.</p>
        <h2>2. Data We Collect</h2>
        <p>We collect information you provide directly to us, such as when you create an account, update your profile, or use our services.</p>
        <h2>3. How We Use Your Data</h2>
        <p>We use the information we collect to provide, maintain, and improve our services, as well as to communicate with you.</p>
        <h2>4. Data Sharing</h2>
        <p>We do not share your personal data with third parties except as necessary to provide our services or as required by law.</p>
        <h2>5. Security</h2>
        <p>We take reasonable measures to help protect your personal data from loss, theft, misuse, and unauthorized access.</p>
        <h2>6. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us.</p>
      </div>
    </div>
  );
}
