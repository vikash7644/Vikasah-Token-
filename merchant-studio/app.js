(() => {
const $=id=>document.getElementById(id), CHAIN_ID="0x61";
const CHAIN_PARAMS={chainId:CHAIN_ID,chainName:"BNB Smart Chain Testnet",nativeCurrency:{name:"tBNB",symbol:"tBNB",decimals:18},rpcUrls:["https://bsc-testnet-dataseed.bnbchain.org"],blockExplorerUrls:["https://testnet.bscscan.com/"]};
const ABI=["function transfer(address to,uint256 value) returns (bool)","event Transfer(address indexed from,address indexed to,uint256 value)"];\nconst TRANSFER_IFACE=new ethers.Interface(ABI);\nconst PUBLIC_RPC="https://bsc-testnet-dataseed.bnbchain.org";
let invoice=null,provider=null,signer=null;
const fmtAddress=v=>v?v.slice(0,6)+"…"+v.slice(-4):"";
const validAddress=v=>window.ethers&&ethers.isAddress(v);
const setStatus=(m,e=false)=>{$("paymentStatus").textContent=m;$("paymentStatus").style.color=e?"var(--danger)":"var(--mint)";};
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function history(){const items=JSON.parse(localStorage.getItem("vkt-invoices")||"[]");$("historyList").innerHTML=items.length?items.slice(0,8).map(x=>'<div class="history-item"><span>'+escapeHtml(x.reference||"Invoice")+' · '+escapeHtml(x.amount)+' VKT</span><code>'+escapeHtml(x.created)+'</code></div>').join(""):'<p class="muted">Invoices created in this browser will appear here.</p>';}
function showInvoice(data,save=true){
 invoice=data;$("emptyState").hidden=true;$("invoiceResult").hidden=false;$("previewAmount").textContent=data.amount;$("previewRef").textContent=data.reference||"No order reference";$("previewWallet").textContent=fmtAddress(data.merchant);$("previewWallet").title=data.merchant;$("previewToken").textContent=fmtAddress(data.token);$("previewToken").title=data.token;$("qrcode").innerHTML="";
 const shareUrl=new URL(location.href);shareUrl.search=new URLSearchParams({to:data.merchant,token:data.token,amount:data.amount,ref:data.reference||""}).toString();
 new QRCode($("qrcode"),{text:shareUrl.toString(),width:160,height:160,correctLevel:QRCode.CorrectLevel.M});
 $("copyLink").onclick=async()=>{try{await navigator.clipboard.writeText(shareUrl.toString());setStatus("Invoice link copied.");}catch{setStatus("Copy is unavailable here. Share the page URL manually.",true);}};
 if(save){const items=JSON.parse(localStorage.getItem("vkt-invoices")||"[]");items.unshift({...data,created:new Date().toLocaleString()});localStorage.setItem("vkt-invoices",JSON.stringify(items.slice(0,20)));history();}
 $("payBtn").disabled=false;$("payBtn").textContent="Pay with wallet";$("payBtn").onclick=payInvoice;setStatus("Request ready. QR contains invoice details only; it does not prove payment.");
}
async function connect(){if(!window.ethereum)throw Error("No browser wallet found. Open this page in a wallet-enabled browser.");if(!window.ethers)throw Error("Wallet library is loading. Try again.");provider=new ethers.BrowserProvider(window.ethereum);await provider.send("eth_requestAccounts",[]);signer=await provider.getSigner();const address=await signer.getAddress();$("walletState").className="wallet-state connected";$("walletState").innerHTML='<span class="wallet-dot"></span><span>'+escapeHtml(fmtAddress(address))+'</span>';$("connectBtn").textContent=fmtAddress(address);return address;}
async function ensureTestnet(){const n=await provider.getNetwork();if(n.chainId===97n)return;try{await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:CHAIN_ID}]});}catch(err){if(err.code!==4902)throw err;await window.ethereum.request({method:"wallet_addEthereumChain",params:[CHAIN_PARAMS]});}provider=new ethers.BrowserProvider(window.ethereum);signer=await provider.getSigner();if((await provider.getNetwork()).chainId!==97n)throw Error("Switch wallet to BNB Smart Chain Testnet (chain ID 97).");}

async function verifyTransaction(){
 const hash=$("txHash").value.trim(), out=$("verifyStatus");
 out.textContent="";out.style.color="var(--mint)";
 if(!/^0x[0-9a-fA-F]{64}$/.test(hash)){out.textContent="Enter a valid 32-byte transaction hash.";out.style.color="var(--danger)";return;}
 if(!invoice){out.textContent="Create or open an invoice first so its token, recipient and amount can be checked.";out.style.color="var(--danger)";return;}
 $("verifyBtn").disabled=true;out.textContent="Checking BNB Smart Chain Testnet…";
 try{
  const readProvider=new ethers.JsonRpcProvider(PUBLIC_RPC,97,{staticNetwork:true});
  const receipt=await readProvider.getTransactionReceipt(hash);
  if(!receipt){out.textContent="Transaction not found yet. Check the hash and try again.";out.style.color="var(--danger)";return;}
  if(receipt.status!==1){out.textContent="Transaction reverted; payment is not confirmed.";out.style.color="var(--danger)";return;}
  const currentBlock=await readProvider.getBlockNumber();
  if(currentBlock<receipt.blockNumber){out.textContent="Waiting for block confirmation.";return;}
  const expected=ethers.parseUnits(invoice.amount,18);
  const matches=receipt.logs.some(log=>{
   if(log.address.toLowerCase()!==invoice.token.toLowerCase())return false;
   try{const parsed=TRANSFER_IFACE.parseLog(log);return parsed&&parsed.name==="Transfer"&&parsed.args.to.toLowerCase()===invoice.merchant.toLowerCase()&&parsed.args.value===expected;}catch{return false;}
  });
  if(!matches){out.textContent="Not a matching VKT payment: token contract, recipient or amount does not match this invoice.";out.style.color="var(--danger)";return;}
  out.textContent="Verified: matching VKT Transfer event in block "+receipt.blockNumber+". Tx: "+hash;
 }catch(err){out.textContent="Could not verify right now: "+(err.shortMessage||err.message||"RPC error");out.style.color="var(--danger)";}
 finally{$("verifyBtn").disabled=false;}
}
\nasync function payInvoice(){if(!invoice)return;try{$("payBtn").disabled=true;setStatus("Connecting wallet…");if(!signer)await connect();await ensureTestnet();const contract=new ethers.Contract(invoice.token,ABI,signer),value=ethers.parseUnits(invoice.amount,18);setStatus("Confirm the VKT transfer in your wallet. Check recipient and amount before signing.");const tx=await contract.transfer(invoice.merchant,value);setStatus("Transaction sent: "+tx.hash+". Waiting for one block confirmation…");const receipt=await tx.wait(1);if(!receipt||receipt.status!==1)throw Error("Transaction was not successful on-chain.");setStatus("Confirmed in block "+receipt.blockNumber+". Tx: "+tx.hash+" · Verify independently on testnet BscScan.");$("payBtn").textContent="Payment confirmed";}catch(err){setStatus(err.shortMessage||err.message||"Payment failed.",true);$("payBtn").disabled=false;}}
$("invoiceForm").addEventListener("submit",e=>{e.preventDefault();$("formError").textContent="";const merchant=$("merchantWallet").value.trim(),token=$("tokenAddress").value.trim(),amount=$("amount").value.trim();if(!validAddress(merchant)||!validAddress(token)){$("formError").textContent="Enter valid merchant and token contract addresses.";return;}if(!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(amount)||Number(amount)<=0){$("formError").textContent="Enter a positive amount with up to 18 decimal places.";return;}showInvoice({merchant:ethers.getAddress(merchant),token:ethers.getAddress(token),amount,reference:$("reference").value.trim()});});
$("connectBtn").addEventListener("click",async()=>{try{await connect();}catch(err){$("walletState").textContent=err.message;}});
$("clearHistory").addEventListener("click",()=>{localStorage.removeItem("vkt-invoices");history();});\n$("verifyBtn").addEventListener("click",verifyTransaction);
const p=new URLSearchParams(location.search);if(p.has("to")&&p.has("token")&&p.has("amount")){const d={merchant:p.get("to"),token:p.get("token"),amount:p.get("amount"),reference:p.get("ref")||""};if(validAddress(d.merchant)&&validAddress(d.token)&&/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(d.amount)&&Number(d.amount)>0){$("merchantWallet").value=d.merchant;$("tokenAddress").value=d.token;$("amount").value=d.amount;$("reference").value=d.reference;showInvoice(d,false);}else setStatus("This invoice link contains invalid details.",true);}
history();if(window.ethereum)window.ethereum.on?.("accountsChanged",()=>{signer=null;provider=null;$("walletState").textContent="Wallet account changed — reconnect to continue.";});
})();