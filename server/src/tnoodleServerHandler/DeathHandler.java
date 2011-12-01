package tnoodleServerHandler;

import java.io.IOException;
import java.net.InetAddress;
import java.util.LinkedHashMap;

import net.gnehzr.tnoodle.server.SafeHttpHandler;
import net.gnehzr.tnoodle.server.TNoodleServer;

import com.sun.net.httpserver.HttpExchange;

public class DeathHandler extends SafeHttpHandler {
	protected void wrappedHandle(HttpExchange t, String path[], LinkedHashMap<String, String> query) throws IOException {
		if(path.length == 1 && path[0].equals("now")) {
			// If localhost makes a request to
			// http://localhost:PORT/kill/now
			// that's enough for us to commit honorable suicide.
			InetAddress remote = t.getRemoteAddress().getAddress();
			System.out.print("Asked to kill myself by " + remote + "...");
			if(remote.isLoopbackAddress()) {
				// Only kill ourselves if someone on this machine requested it
				sendText(t, "Nice knowing ya'!");
				System.out.println("committing suicide");
				System.exit(0);
			}
			System.out.println("ignoring request");
		}
		sendText(t, TNoodleServer.NAME + "-" + TNoodleServer.VERSION);
	}
}
