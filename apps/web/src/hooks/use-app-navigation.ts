import { useNavigate } from "react-router-dom";
import {
  buildChatBasePath,
  buildChatPath,
  type RequestedChatSession,
} from "@/lib/chat-history";
import { pathForPage, type PageId } from "@/lib/navigation";

export function useAppNavigation() {
  const navigate = useNavigate();

  return {
    navigateToPage(pageId: PageId) {
      navigate(pathForPage(pageId));
    },
    navigateToChat(session: RequestedChatSession) {
      navigate(buildChatPath(session.profileId, session.sessionId));
    },
    navigateToNewChat(profileId?: string | null) {
      const params = new URLSearchParams({ new: "1", _: String(Date.now()) });
      if (profileId) {
        params.set("profile", profileId);
      }
      navigate(`${buildChatBasePath()}?${params.toString()}`);
    },
  };
}
