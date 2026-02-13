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
            <div>
                <HelpfulInfo />

                <div className="mt-10">
                    <h2 className="text-lg font-semibold tracking-tight mb-4">Public Relays</h2>
                    <PublicRelays />
                </div>
            </div>
        );
    }

    return <RelayDashboard />;
}
