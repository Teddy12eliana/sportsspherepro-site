export async function handler(){
  // Basic tier ladder preview; production should compute from analytics
  return { statusCode:200, headers:{'Content-Type':'application/json'}, body: JSON.stringify({ nextTier:'earlyInsider', discount:50, durationDays:60, couponId: null }) };
}