import { getServerSession } from "next-auth/next";
import authOptions from "../../pages/api/auth/[...nextauth]";
import PublicRelays from "./publicRelays";
import CreateRelay from "./createRelay";
import HelpfulInfo from "./helpfulInfo";
import RelayDashboard from "./relayDashboard";

export default async function Relays() {

    const session = await getServerSession(authOptions);

    if (!session || !(session as any).user.name) {
        return (
            <div className="py-12">
                <div className="max-w-6xl mx-auto">
                    <HelpfulInfo />

                    <div className="mt-12">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold tracking-tight">Public Relays</h2>
                        </div>
                        <PublicRelays />
                    </div>
                </div>
            </div>
        );
    }

    return <RelayDashboard />;
}
