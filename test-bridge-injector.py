import socket
import hashlib
import base64
import json
import time
import threading

# A simple raw Python WebSocket server with zero external dependencies.
# Used to test the Foundry module roll rendering client-side.

GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

def create_handshake_response(key):
    accept_val = base64.b64encode(hashlib.sha1((key + GUID).encode('utf-8')).digest()).decode('utf-8')
    return (
        "HTTP/1.1 101 Switching Protocols\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Accept: {}\r\n\r\n"
    ).format(accept_val)

def encode_websocket_frame(payload):
    # Creates a text frame (0x81) containing JSON payload
    data = json.dumps(payload).encode('utf-8')
    length = len(data)
    
    frame = bytearray([0x81])
    if length <= 125:
        frame.append(length)
    elif length <= 65535:
        frame.append(126)
        frame.extend(length.to_bytes(2, byteorder='big'))
    else:
        frame.append(127)
        frame.extend(length.to_bytes(8, byteorder='big'))
        
    frame.extend(data)
    return bytes(frame)

def handle_client(conn, addr):
    print(f"\n[Bridge] Foundry VTT client connected from {addr}")
    try:
        # 1. Complete Handshake
        request = conn.recv(1024).decode('utf-8', errors='ignore')
        key = None
        for line in request.split("\r\n"):
            if line.startswith("Sec-WebSocket-Key:"):
                key = line.split(":")[1].strip()
                break
                
        if not key:
            print("[Bridge] Invalid WebSocket request received.")
            conn.close()
            return
            
        conn.sendall(create_handshake_response(key).encode('utf-8'))
        print("[Bridge] Handshake complete! Connection established.")
        
        # 2. Command menu loop
        while True:
            print("\n" + "="*40)
            print("  DDB Gamelog Mock Event Injector")
            print("="*40)
            print(" 1. Send Attack Roll (d20, Shortsword)")
            print(" 2. Send Damage Roll (1d6+3, Shortsword)")
            print(" 3. Send Healing Roll (1d8+4, Cure Wounds)")
            print(" Q. Quit")
            print("="*40)
            choice = input("Select an option: ").strip().lower()
            
            if choice == '1':
                payload = {
                    "type": "ddb-roll",
                    "character": "Aria",
                    "entity_id": 123456,
                    "entity_type": "character",
                    "action": "Shortsword",
                    "rollType": "to hit",
                    "total": 18,
                    "text": "1d20 + 5",
                    "constant": 5,
                    "dice": [{"faces": 20, "result": 13}]
                }
                print("[Bridge] Injecting Shortsword Attack Roll...")
                conn.sendall(encode_websocket_frame(payload))
            elif choice == '2':
                payload = {
                    "type": "ddb-roll",
                    "character": "Aria",
                    "entity_id": 123456,
                    "entity_type": "character",
                    "action": "Shortsword",
                    "rollType": "damage",
                    "total": 8,
                    "text": "1d6 + 3",
                    "constant": 3,
                    "dice": [{"faces": 6, "result": 5}]
                }
                print("[Bridge] Injecting Shortsword Damage Roll...")
                conn.sendall(encode_websocket_frame(payload))
            elif choice == '3':
                payload = {
                    "type": "ddb-roll",
                    "character": "Aria",
                    "entity_id": 123456,
                    "entity_type": "character",
                    "action": "Cure Wounds",
                    "rollType": "heal",
                    "total": 12,
                    "text": "1d8 + 4",
                    "constant": 4,
                    "dice": [{"faces": 8, "result": 8}]
                }
                print("[Bridge] Injecting Cure Wounds Healing Roll...")
                conn.sendall(encode_websocket_frame(payload))
            elif choice == 'q':
                print("[Bridge] Closing connection.")
                break
            else:
                print("[Bridge] Invalid choice.")
                
            time.sleep(0.5)
            
    except Exception as e:
        print(f"[Bridge] Connection error: {e}")
    finally:
        conn.close()
        print("[Bridge] Connection closed.")

def run_server():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(('localhost', 8765))
    s.listen(1)
    print("[Bridge] Server running on ws://localhost:8765/ws")
    print("[Bridge] Awaiting connection from Foundry VTT client...")
    
    try:
        while True:
            conn, addr = s.accept()
            # Handle client in a separate thread so we can reconnect
            threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()
    except KeyboardInterrupt:
        print("\n[Bridge] Server stopped.")
    finally:
        s.close()

if __name__ == "__main__":
    run_server()
