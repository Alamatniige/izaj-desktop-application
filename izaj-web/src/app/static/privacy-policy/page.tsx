export default function PrivacyPolicyPage() {
	return (
		<div className="max-w-3xl mx-auto px-6 py-12 text-black">
			<h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
			<p className="mb-4">This page explains how we collect, use, and protect your personal information.</p>
			<h2 className="text-xl font-semibold mt-6 mb-2">Data We Collect</h2>
			<ul className="list-disc pl-5 space-y-1">
				<li>Account information (name, email)</li>
				<li>Order and checkout details</li>
				<li>Technical data (device, browser, IP)</li>
			</ul>
			<h2 className="text-xl font-semibold mt-6 mb-2">How We Use Data</h2>
			<ul className="list-disc pl-5 space-y-1">
				<li>To create and manage your account</li>
				<li>To process orders and provide support</li>
				<li>To improve site performance and security</li>
			</ul>
			<h2 className="text-xl font-semibold mt-6 mb-2">Contact</h2>
			<p>If you have questions, contact us at <a className="underline" href="mailto:support@example.com">support@example.com</a>.</p>
		</div>
	);
}


