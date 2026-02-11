import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../stores/auth";
import { api } from "../lib/api";
import { Radio, Check } from "lucide-react";
import { nip19 } from "nostr-tools";

export default function CreateRelay() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"standard" | "premium">("standard");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const domain = "mycelium.social";

  function validateName(val: string) {
    setName(val);
    setError("");
    if (!val) {
      setNameError("");
      return;
    }
    if (/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}$/.test(val)) {
      setNameError("");
    } else {
      setNameError("Must be a valid hostname (letters, numbers, hyphens)");
    }
  }

  function isValid() {
    return user && name.length > 0 && !nameError;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid() || !user) return;

    setSubmitting(true);
    setError("");

    try {
      let submitHex = user.pubkey;
      if (/^npub1[0-9a-zA-Z]{58}$/.test(user.pubkey)) {
        const decoded = nip19.decode(user.pubkey);
        submitHex = decoded.data as string;
      }

      const data = await api.get<{ order_id: string }>(
        `/invoices?relayname=${name}&pubkey=${submitHex}&plan=${selectedPlan}`
      );

      navigate(`/invoices?relayname=${name}&pubkey=${submitHex}&order_id=${data.order_id}&plan=${selectedPlan}`);
    } catch (err: any) {
      setError(err.message || "Failed to create relay");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[80vh] p-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2">Create Your Nostr Relay</h1>
        <p className="text-lg text-base-content/60">Choose your plan and get started in minutes</p>
      </div>

      {/* Plan Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
        <div
          className={`card border-2 cursor-pointer transition-all ${
            selectedPlan === "standard"
              ? "border-primary bg-primary/10 shadow-lg"
              : "border-base-300 hover:border-primary/50"
          }`}
          onClick={() => setSelectedPlan("standard")}
        >
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <h2 className="card-title text-2xl">Standard</h2>
              <input type="radio" className="radio radio-primary" checked={selectedPlan === "standard"} readOnly />
            </div>
            <div className="text-3xl font-bold text-primary mb-4">
              21 <span className="text-sm font-normal text-base-content/50">sats</span>
            </div>
            <ul className="space-y-2 text-sm">
              {["Customizable on-the-fly", "Inbox / Outbox support", "Public / Private modes", "Communities / DMs"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div
          className={`card border-2 cursor-pointer transition-all ${
            selectedPlan === "premium"
              ? "border-secondary bg-secondary/10 shadow-lg"
              : "border-base-300 hover:border-secondary/50"
          }`}
          onClick={() => setSelectedPlan("premium")}
        >
          <div className="card-body">
            <div className="flex items-center justify-between mb-2">
              <h2 className="card-title text-2xl">Premium</h2>
              <input type="radio" className="radio radio-secondary" checked={selectedPlan === "premium"} readOnly />
            </div>
            <div className="badge badge-secondary badge-sm mb-2">RECOMMENDED</div>
            <div className="text-3xl font-bold text-secondary mb-4">
              2,100 <span className="text-sm font-normal text-base-content/50">sats</span>
            </div>
            <ul className="space-y-2 text-sm">
              {["All standard features", "Streaming from other relays", "Enhanced filtering by social graph"].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card shadow-xl max-w-4xl mx-auto">
        <div className="card-body">
          <h3 className="card-title text-xl mb-6">Configure Your Relay</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label"><span className="label-text font-semibold">Your Pubkey</span></label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={user?.pubkey || ""}
                placeholder="Sign in to auto-fill"
                readOnly
              />
              {!user && <p className="text-sm text-warning mt-1">Sign in with NIP-07 to continue</p>}
            </div>

            <div>
              <label className="label"><span className="label-text font-semibold">Relay Subdomain</span></label>
              <div className="flex">
                <input
                  type="text"
                  className="input input-bordered flex-1"
                  placeholder="yourname"
                  autoComplete="off"
                  autoFocus
                  value={name}
                  onChange={(e) => validateName(e.target.value)}
                />
                <span className="input input-bordered input-disabled flex items-center px-3 ml-2 text-base-content/50">
                  .{domain}
                </span>
              </div>
              {nameError && <p className="text-sm text-error mt-1">{nameError}</p>}
              {name && !nameError && (
                <p className="text-sm text-base-content/60 mt-1">
                  Your relay: <span className="font-semibold text-primary">{name}.{domain}</span>
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="alert alert-error mt-4">
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-center mt-8">
            <button
              type="submit"
              className="btn btn-primary btn-lg px-8"
              disabled={!isValid() || submitting}
            >
              {submitting ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <Radio className="w-5 h-5" />
                  Deploy {selectedPlan === "premium" ? "Premium" : "Standard"} Relay
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
