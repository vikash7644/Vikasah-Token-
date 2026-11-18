(() => {
const $=id=>document.getElementById(id), CHAIN_ID="0x61", MAX_INVOICE_VKT=1_000_000_000n;
const CHAIN_PARAMS={chainId:CHAIN_ID,chainName:"BNB Smart Chain Testnet",nativeCurrency:{name:"tBNB",symbol:"tBNB",decimals:18},rpcUrls:["https://bsc-testnet-dataseed.bnbchain.org"],blockExplorerUrls:["https://testnet.bscscan.com/"]};
const ABI=["function transfer(address to,uint256 value) returns (bool)","event Transfer(address indexed from,address indexed to,uint256 value)"];
let invoice=null,provider=null,signer=null;
const fmtAddress=v=>v?v.slice(0,6)+"…"+v.slice(-4):"";
const validAddress=v=>window.ethers&&ethers.isAddress(v);
const setStatus=(m,e=false)=>{$("paymentStatus").textContent=m;$("paymentStatus").style.color=e?"var(--danger)":"var(--mint)";};
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function history(){const items=JSON.parse(localStorage.getItem("vkt-invoices")||"[]");$("historyList").innerHTML=items.length?items.slice(0,8).map(x=>'<div class="history-item"><span>'+escapeHtml(x.reference||"Invoice")+' · '+escapeHtml(x.amount)+' VKT</span><code>'+escapeHtml(x.created)+'</code></div>').join(""):'<p class="muted">Invoices created in this browser will appear here.</p>';}
function showInvoice(data,save=true){
 invoice={...data,invoiceId:data.invoiceId||(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+"-"+Math.random().toString(36).slice(2))};$("emptyState").hidden=true;$("invoiceResult").hidden=false;$("previewAmount").textContent=data.amount;$("previewRef").textContent=data.reference||"No order reference";$("previewWallet").textContent=fmtAddress(data.merchant);$("previewWallet").title=data.merchant;$("previewToken").textContent=fmtAddress(data.token);$("previewToken").title=data.token;$("previewInvoiceId").textContent=invoice.invoiceId;$("qrcode").innerHTML="";
 const shareUrl=new URL(location.href);shareUrl.search=new URLSearchParams({to:data.merchant,token:data.token,amount:data.amount,ref:data.reference||"",id:invoice.invoiceId}).toString();
 new QRCode($("qrcode"),{text:shareUrl.toString(),width:160,height:160,correctLevel:QRCode.CorrectLevel.M});
 $("copyLink").onclick=async()=>{try{await navigator.clipboard.writeText(shareUrl.toString());setStatus("Invoice link copied.");}catch{setStatus("Copy is unavailable here. Share the page URL manually.",true);}};
 if(save){const items=JSON.parse(localStorage.getItem("vkt-invoices")||"[]");items.unshift({...invoice,created:new Date().toLocaleString()});localStorage.setItem("vkt-invoices",JSON.stringify(items.slice(0,20)));history();}
 $("payBtn").disabled=false;$("payBtn").textContent="Pay with wallet";$("payBtn").onclick=payInvoice;setStatus("Request ready. QR contains invoice details only; it does not prove payment.");
}
async function connect(){if(!window.ethereum)throw Error("No browser wallet found. Open this page in a wallet-enabled browser.");if(!window.ethers)throw Error("Wallet library is loading. Try again.");provider=new ethers.BrowserProvider(window.ethereum);await provider.send("eth_requestAccounts",[]);signer=await provider.getSigner();const address=await signer.getAddress();$("walletState").className="wallet-state connected";$("walletState").innerHTML='<span class="wallet-dot"></span><span>'+escapeHtml(fmtAddress(address))+'</span>';$("connectBtn").textContent=fmtAddress(address);return address;}
async function ensureTestnet(){const n=await provider.getNetwork();if(n.chainId===97n)return;try{await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:CHAIN_ID}]});}catch(err){if(err.code!==4902)throw err;await window.ethereum.request({method:"wallet_addEthereumChain",params:[CHAIN_PARAMS]});}provider=new ethers.BrowserProvider(window.ethereum);signer=await provider.getSigner();if((await provider.getNetwork()).chainId!==97n)throw Error("Switch wallet to BNB Smart Chain Testnet (chain ID 97).");}

async function refreshInvoiceStatus(){
 if(!invoice||!invoice.invoiceId)return;
 try{
  const response=await fetch("/api/vkt/invoices/"+encodeURIComponent(invoice.invoiceId));
  if(!response.ok)return;
  const status=await response.json().catch(()=>({}));
  if(status.status==="paid"){
   if(status.transactionHash)$("txHash").value=status.transactionHash;
   $("payBtn").disabled=true;
   $("payBtn").textContent="Payment verified";
   $("verifyStatus").textContent="Invoice status: PAID · "+(status.amount||invoice.amount)+" VKT";
   setStatus("Server confirms this invoice is already PAID.");
  }else if(status.status==="pending"){
   $("verifyStatus").textContent="Invoice status: PENDING";
  }
 }catch{
  // A temporary status lookup failure must not change or imply payment state.
 }
}
async function verifyTransaction(){
 const hash=$("txHash").value.trim(),out=$("verifyStatus");
 out.textContent="";out.style.color="var(--mint)";
 if(!/^0x[0-9a-fA-F]{64}$/.test(hash)){out.textContent="Enter a valid 32-byte transaction hash.";out.style.color="var(--danger)";return;}
 if(!invoice||!invoice.invoiceId){out.textContent="Open a valid invoice before checking its payment.";out.style.color="var(--danger)";return;}
 $("verifyBtn").disabled=true;out.textContent="Asking the merchant verifier to check this invoice…";
 try{
  const response=await fetch("/api/vkt/payments/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({invoiceId:invoice.invoiceId,transactionHash:hash})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok&&response.status!==202)throw Error(result.error||"Payment verification failed.");
  const statusResponse=await fetch("/api/vkt/invoices/"+encodeURIComponent(invoice.invoiceId));
  const status=await statusResponse.json().catch(()=>({}));
  if(statusResponse.ok&&status.status==="paid"){
   out.textContent="Server verified invoice as PAID · "+status.amount+" VKT · "+(status.transactionHash||hash);
   out.style.color="var(--mint)";
  }else if(response.status===202){
   out.textContent=result.message||("Payment is still confirming on BNB Testnet. "+(result.confirmations||0)+"/"+(result.required||3)+" confirmations.");
  }else{
   out.textContent=status.error||result.error||"Payment is not yet verified. Retry after more confirmations.";
   out.style.color="var(--danger)";
  }
 }catch(err){out.textContent=err.message||"Merchant verifier is unavailable.";out.style.color="var(--danger)";}
 finally{$("verifyBtn").disabled=false;}
}

async function payInvoice(){
 if(!invoice)return;
 let transactionSubmitted=false;
 try{
  $("payBtn").disabled=true;setStatus("Connecting wallet…");
  if(!signer)await connect();await ensureTestnet();
  const configResponse=await fetch("/api/vkt/config");
  const config=await configResponse.json().catch(()=>({}));
  if(!configResponse.ok||config.chainId!==97||typeof config.tokenAddress!=="string"||typeof config.merchantAddress!=="string"){
   throw Error(config.error||"The merchant backend has no verified BNB testnet checkout configuration.");
  }
  if(config.tokenAddress.toLowerCase()!==invoice.token.toLowerCase()||config.merchantAddress.toLowerCase()!==invoice.merchant.toLowerCase()){
   throw Error("Invoice token or merchant address does not match the server's configured VKT checkout. No transfer was sent.");
  }
  const payerAddress=await signer.getAddress();
  const createResponse=await fetch("/api/vkt/invoices",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({invoiceId:invoice.invoiceId,amount:invoice.amount,payerAddress})});
  const created=await createResponse.json().catch(()=>({}));
  if(!createResponse.ok){
   if(createResponse.status===409){
    const existingResponse=await fetch("/api/vkt/invoices/"+encodeURIComponent(invoice.invoiceId));
    const existing=await existingResponse.json().catch(()=>({}));
    if(!existingResponse.ok||existing.payerAddress?.toLowerCase()!==payerAddress.toLowerCase()||ethers.parseUnits(existing.amount,18)!==ethers.parseUnits(invoice.amount,18)||existing.status!=="pending"){
     throw Error("This invoice ID is already registered with different details or has already been paid. Create a new invoice.");
    }
   }else throw Error(created.error||"Could not register invoice with the merchant verifier.");
  }
  const contract=new ethers.Contract(invoice.token,ABI,signer),value=ethers.parseUnits(invoice.amount,18);
  setStatus("Confirm the VKT transfer in your wallet. Check recipient and amount before signing.");
  const tx=await contract.transfer(invoice.merchant,value);
  $("txHash").value=tx.hash;
  transactionSubmitted=true;
  setStatus("Transaction sent: "+tx.hash+". Waiting for one block confirmation…");
  const receipt=await tx.wait(1);
  if(!receipt||receipt.status!==1)throw Error("Transaction was not successful on-chain.");
  setStatus("Receipt found. Merchant verifier is checking the exact payer, recipient, amount and confirmations…");
  let paid=false,lastMessage="Transaction is confirming on BNB Testnet.";
  for(let attempt=0;attempt<8;attempt++){
   const verifyResponse=await fetch("/api/vkt/payments/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({invoiceId:invoice.invoiceId,transactionHash:tx.hash})});
   const verification=await verifyResponse.json().catch(()=>({}));
   if(verifyResponse.ok&&verification.status==="paid"){paid=true;break;}
   if(verifyResponse.status===422||verifyResponse.status===409)throw Error(verification.error||"The verifier rejected this payment.");
   if(verifyResponse.status!==202)throw Error(verification.error||"Payment verification service is unavailable.");
   lastMessage=verification.message||("Confirmations: "+(verification.confirmations||0)+"/"+(verification.required||3));
   setStatus(lastMessage+" Checking again…");
   await new Promise(resolve=>setTimeout(resolve,3000));
  }
  if(!paid){
   const statusResponse=await fetch("/api/vkt/invoices/"+encodeURIComponent(invoice.invoiceId));
   const status=await statusResponse.json().catch(()=>({}));
   paid=statusResponse.ok&&status.status==="paid";
  }
  if(paid){
   const statusResponse=await fetch("/api/vkt/invoices/"+encodeURIComponent(invoice.invoiceId));
   const status=await statusResponse.json().catch(()=>({}));
   setStatus("Server verified PAID · "+(status.amount||invoice.amount)+" VKT · "+tx.hash);
   $("payBtn").textContent="Payment verified";
   $("verifyStatus").textContent="Invoice status: PAID";
  }else{
   setStatus("Transaction sent, but the server has not yet marked it paid. Do not pay again. Use Verify transaction to retry. "+lastMessage,true);
   $("payBtn").disabled=true;
   $("payBtn").textContent="Payment sent · verify status";
  }
 }catch(err){
  setStatus((transactionSubmitted?"Transaction was already sent. Do not send another payment. Verify the saved transaction hash. ":"")+(err.shortMessage||err.message||"Payment failed."),true);
  $("payBtn").disabled=transactionSubmitted;
  if(transactionSubmitted)$("payBtn").textContent="Payment sent · verify status";
 }
}
$("invoiceForm").addEventListener("submit",e=>{e.preventDefault();$("formError").textContent="";const merchant=$("merchantWallet").value.trim(),token=$("tokenAddress").value.trim(),amount=$("amount").value.trim();if(!validAddress(merchant)||!validAddress(token)){$("formError").textContent="Enter valid merchant and token contract addresses.";return;}try{const units=ethers.parseUnits(amount,18);if(units<=0n||units>MAX_INVOICE_VKT*10n**18n)throw Error("Invoice amount must be greater than zero and no more than 1,000,000,000 VKT.");}catch(err){$("formError").textContent=err.message||"Invalid VKT amount.";return;}showInvoice({merchant:ethers.getAddress(merchant),token:ethers.getAddress(token),amount,reference:$("reference").value.trim()});});
$("connectBtn").addEventListener("click",async()=>{try{await connect();}catch(err){$("walletState").textContent=err.message;}});
$("clearHistory").addEventListener("click",()=>{localStorage.removeItem("vkt-invoices");history();});
$("verifyBtn").addEventListener("click",verifyTransaction);
const p=new URLSearchParams(location.search);if(p.has("to")&&p.has("token")&&p.has("amount")){const d={merchant:p.get("to"),token:p.get("token"),amount:p.get("amount"),reference:p.get("ref")||"",invoiceId:p.get("id")||undefined};if(validAddress(d.merchant)&&validAddress(d.token)&&/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(d.amount)&&Number(d.amount)>0){$("merchantWallet").value=d.merchant;$("tokenAddress").value=d.token;$("amount").value=d.amount;$("reference").value=d.reference;showInvoice(d,false);refreshInvoiceStatus();}else setStatus("This invoice link contains invalid details.",true);}
history();if(window.ethereum){window.ethereum.on?.("accountsChanged",()=>{signer=null;provider=null;$("walletState").textContent="Wallet account changed — reconnect to continue.";});window.ethereum.on?.("chainChanged",()=>{signer=null;provider=null;$("walletState").textContent="Network changed — reconnect and confirm BNB Testnet.";setStatus("Wallet network changed. Reconnect before making a payment.",true);});}
})();