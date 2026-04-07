import React from 'react';

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <div className="prose dark:prose-invert">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using Tended, you agree to be bound by these Terms of Service.</p>
        <h2>2. Use of Service</h2>
        <p>You agree to use our services only for lawful purposes and in accordance with these terms.</p>
        <h2>3. User Accounts</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
        <h2>4. Content</h2>
        <p>You retain ownership of the content you submit, but grant us a license to use it to provide our services.</p>
        <h2>5. Termination</h2>
        <p>We reserve the right to terminate or suspend your access to our services at any time, with or without cause.</p>
        <h2>6. Limitation of Liability</h2>
        <p>In no event shall Tended be liable for any indirect, incidental, special, or consequential damages.</p>
        <h2>7. Contact Us</h2>
        <p>If you have any questions about these Terms, please contact us.</p>
      </div>
    </div>
  );
}
