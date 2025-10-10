export default function DataDeletionPage() {
	return (
		<div className="max-w-3xl mx-auto px-6 py-12 text-black">
			<h1 className="text-3xl font-bold mb-4">User Data Deletion</h1>
			<p className="mb-4">You can request deletion of your account and associated personal data.</p>
			<h2 className="text-xl font-semibold mt-6 mb-2">How to request deletion</h2>
			<ol className="list-decimal pl-5 space-y-1">
				<li>Send an email to <a className="underline" href="mailto:support@example.com">support@example.com</a> from your registered email.</li>
				<li>Include the subject: "Account Deletion Request".</li>
				<li>We will verify your identity and process your request within 30 days.</li>
			</ol>
			<h2 className="text-xl font-semibold mt-6 mb-2">What will be deleted</h2>
			<ul className="list-disc pl-5 space-y-1">
				<li>Account and profile data</li>
				<li>Order history where permitted by law and accounting rules</li>
			</ul>
		</div>
	);
}


