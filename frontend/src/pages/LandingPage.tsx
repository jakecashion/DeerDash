import { SignInButton } from "@clerk/clerk-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <h1 className="text-4xl font-bold text-gray-900">DeerDash</h1>
      <p className="mt-3 text-lg text-gray-600 text-center max-w-md">
        Upload trail camera photos and let AI detect deer activity patterns
        across your property.
      </p>
      <SignInButton mode="modal">
        <button className="mt-8 px-6 py-3 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors">
          Sign in to get started
        </button>
      </SignInButton>
    </div>
  );
}
