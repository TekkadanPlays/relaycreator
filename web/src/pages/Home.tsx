import { Link } from "react-router";
import { Radio, Zap, Shield, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="hero min-h-[70vh]">
      <div className="hero-content text-center">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-bold">Your Nostr Relay, Your Rules</h1>
          <p className="py-6 text-lg text-base-content/70">
            Deploy a customizable Nostr relay in minutes. Control who can post,
            moderate content, and connect with the decentralized social network.
          </p>
          <Link to="/signup" className="btn btn-primary btn-lg gap-2">
            <Radio className="w-5 h-5" /> Create Your Relay
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="card bg-base-200">
              <div className="card-body items-center text-center">
                <Zap className="w-10 h-10 text-warning" />
                <h3 className="card-title text-lg">Lightning Fast</h3>
                <p className="text-sm text-base-content/60">Powered by strfry, one of the fastest relay implementations</p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body items-center text-center">
                <Shield className="w-10 h-10 text-success" />
                <h3 className="card-title text-lg">Full Control</h3>
                <p className="text-sm text-base-content/60">Allow lists, block lists, keyword filters, and Web of Access</p>
              </div>
            </div>
            <div className="card bg-base-200">
              <div className="card-body items-center text-center">
                <Globe className="w-10 h-10 text-info" />
                <h3 className="card-title text-lg">Your Subdomain</h3>
                <p className="text-sm text-base-content/60">Get yourname.mycelium.social with instant DNS and SSL</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
