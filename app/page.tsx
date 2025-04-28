"use client";

import Image from "next/image";
import App from "./components/App";
import { XIcon } from "./components/icons/XIcon";
import { LinkedInIcon } from "./components/icons/LinkedInIcon";
import { FacebookIcon } from "./components/icons/FacebookIcon";
import GitHubButton from "react-github-btn";

const Home = () => {
  return (
    <>
      <div className="h-full overflow-hidden">
        {/* height 4rem */}
        <div className="bg-gradient-to-b from-black/50 to-black/10 backdrop-blur-[2px] h-[4rem] flex items-center">
          <header className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 flex items-center justify-between">
            <div>
              <a className="flex items-center" href="/">
                <Image
                  className="w-auto h-8 max-w-[12.5rem] sm:max-w-none"
                  src="/deepgram.svg"
                  alt="Deepgram Logo"
                  width={0}
                  height={0}
                  priority
                />
              </a>
            </div>
          </header>
        </div>

        {/* height 100% minus 8rem */}
        <main className="mx-auto px-4 md:px-6 lg:px-8 h-[calc(100%-4rem)] -mb-[4rem]">
          <App />
        </main>

        {/* height 4rem */}
        <div className="bg-black/80 h-[4rem] flex items-center absolute w-full">
          <footer className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 flex items-center justify-center gap-4 md:text-xl font-inter text-[#8a8a8e]">
            <span className="text-base text-[#4e4e52]">share it</span>
            
          </footer>
        </div>
      </div>
    </>
  );
};

export default Home;
