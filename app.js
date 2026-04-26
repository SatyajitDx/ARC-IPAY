<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
    <title>ARC INDIPAY - FIX</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
    <style>
        body { background: linear-gradient(160deg, #FF9933 0%, #FFFFFF 50%, #138808 100%) !important; min-height: 100vh; font-family: sans-serif; margin: 0; }
        .app-container { max-width: 480px; margin: 0 auto; padding: 20px; }
        .glass { background: rgba(255, 255, 255, 0.4); backdrop-filter: blur(15px); border: 1px solid rgba(255,255,255,0.3); border-radius: 24px; color: #000; }
        .tiranga-text { background: linear-gradient(90deg, #FF9933 0%, #000080 50%, #138808 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 900; }
        .dropdown-menu { display: none; position: absolute; right: 0; top: 45px; background: white; min-width: 160px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); border-radius: 12px; z-index: 1000; }
        .show { display: block !important; }
        .hidden { display: none !important; }
        input { background: rgba(255, 255, 255, 0.7) !important; border: 1px solid rgba(0,0,0,0.1) !important; width: 100%; padding: 15px; border-radius: 12px; margin-bottom: 10px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="app-container">
        <div class="flex justify-between items-center mb-8">
            <h2 class="tiranga-text font-black italic text-2xl uppercase">Arc Indipay</h2>
            <div class="relative">
                <button id="walletBtn" onclick="toggleProfile()" class="glass py-2 px-4 flex items-center gap-2 text-[10px] font-black uppercase">
                    <span id="dot" class="bg-red-500 w-2 h-2 rounded-full animate-pulse"></span>
                    <span id="walletLabel">Connect Wallet</span>
                </button>
                <div id="profileMenu" class="dropdown-menu">
                    <button onclick="copyAddr()" class="w-full text-left px-4 py-2 border-b">Copy Address</button>
                    <button onclick="disconnectWallet()" class="w-full text-left px-4 py-2 text-red-500">Disconnect</button>
                </div>
            </div>
        </div>

        <div class="glass p-8 mb-8 text-center shadow-xl">
            <p class="text-[10px] opacity-60 mb-1 uppercase">Arc Network (Testnet)</p>
            <h1 class="text-5xl font-black italic"><span id="usdcBal">0.00</span> <span class="text-2xl opacity-40">USDC</span></h1>
            <p class="text-xl font-bold mt-1 text-[#000080]">≈ ₹<span id="inrBal">0.00</span></p>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
            <div onclick="openSend()" class="glass p-8 text-center cursor-pointer active:scale-95"><i class="fa-solid fa-paper-plane text-3xl mb-3 text-[#FF9933]"></i><p class="text-xs font-black uppercase italic">Send</p></div>
            <div onclick="openReceive()" class="glass p-8 text-center cursor-pointer active:scale-95"><i class="fa-solid fa-qrcode text-3xl mb-3 text-[#000080]"></i><p class="text-xs font-black uppercase italic">Receive</p></div>
        </div>
        <div class="grid grid-cols-2 gap-4 mb-8">
            <div onclick="alert('Scanner Ready')" class="glass p-8 text-center cursor-pointer active:scale-95"><i class="fa-solid fa-expand text-3xl mb-3 text-[#138808]"></i><p class="text-xs font-black uppercase italic">Scan & Pay</p></div>
            <div onclick="getTxLogs()" class="glass p-8 text-center cursor-pointer active:scale-95"><i class="fa-solid fa-clock-rotate-left text-3xl mb-3 opacity-40"></i><p class="text-xs font-black uppercase italic">History</p></div>
        </div>

        <div class="glass p-6 mb-6">
            <h3 class="text-[#000080] font-black italic text-sm mb-5 uppercase text-center">Bookings & Tickets</h3>
            <div class="grid grid-cols-4 gap-2 text-center">
                <div onclick="startFlow('flight')" class="glass py-4 cursor-pointer active:scale-95"><i class="fa-solid fa-plane text-[#FF9933]"></i><p class="text-[8px] font-black mt-1">FLIGHT</p></div>
                <div onclick="startFlow('bus')" class="glass py-4 cursor-pointer active:scale-95"><i class="fa-solid fa-bus text-[#138808]"></i><p class="text-[8px] font-black mt-1">BUS</p></div>
                <div onclick="startFlow('train')" class="glass py-4 cursor-pointer active:scale-95"><i class="fa-solid fa-train text-[#FF9933]"></i><p class="text-[8px] font-black mt-1">TRAIN</p></div>
                <div onclick="startFlow('hotel')" class="glass py-4 cursor-pointer active:scale-95"><i class="fa-solid fa-hotel text-[#138808]"></i><p class="text-[8px] font-black mt-1">HOTEL</p></div>
            </div>
        </div>

        <div class="glass p-6 mb-8">
            <h3 class="text-[#000080] font-black italic text-sm mb-5 uppercase text-center">Bills & Recharges</h3>
            <div class="grid grid-cols-4 gap-2 text-center">
                <div onclick="startFlow('mobile')" class="glass py-4 cursor-pointer active:scale-95"><i class="fa-solid fa-mobile-screen text-[#FF9933]"></i><p class="text-[8px] font-black mt-1">MOBILE</p></div>
                <div onclick="startFlow('electric')" class="glass py-4 cursor-pointer active:scale-95"><i class="fa-solid fa-lightbulb text-[#138808]"></i><p class="text-[8px] font-black mt-1">ELECTRIC</p></div>
                <div onclick="startFlow('dth')" class="glass py-4 cursor-pointer active:scale-95"><i class="fa-solid fa-tv text-[#FF9933]"></i><p class="text-[8px] font-black mt-1">DTH</p></div>
                <div onclick="startFlow('wifi')" class="glass py-4 cursor-pointer active:scale-95"><i class="fa-solid fa-wifi text-[#138808]"></i><p class="text-[8px] font-black mt-1">WIFI</p></div>
            </div>
        </div>
    </div>

    <div id="receiveModal" class="fixed inset-0 bg-black/80 hidden flex items-center justify-center p-6 z-[300]">
        <div class="glass p-8 w-full max-w-sm text-center" style="background: white;">
            <div id="qrcode" class="flex justify-center mb-4"></div>
            <p id="myAddr" class="text-[9px] font-mono break-all mb-4 text-black"></p>
            <button onclick="closeModal('receiveModal')" class="w-full bg-[#000080] text-white py-3 rounded-xl font-bold">CLOSE</button>
        </div>
    </div>

    <script src="app.js"></script>
</body>
</html>
