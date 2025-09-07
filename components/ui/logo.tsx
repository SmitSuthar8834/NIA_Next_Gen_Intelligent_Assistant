import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
  showText?: boolean
  textClassName?: string
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8", 
  lg: "h-10 w-10"
}

export function Logo({ 
  className, 
  size = "md", 
  showText = true, 
  textClassName 
}: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <img
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Image%20%284%29.jpg-8vlSJ4HrZAgkqJDnr7PHTvGIVGx60j.jpeg"
        alt="NIA logo"
        className={cn(sizeClasses[size], "rounded-sm", className)}
      />
      {showText && (
        <span className={cn("font-semibold", textClassName)}>
          NIA
        </span>
      )}
    </div>
  )
}