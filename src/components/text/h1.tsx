import React from "react";

interface H1tagProps {
    H1: string;
    subHeading: string;
    subPara: string;
}

const H1tag: React.FC<H1tagProps> = ({ H1, subHeading, subPara}) => {
  return (
    <div>
      <span className="text-sm uppercase empty:hidden m-0 p-0">{subHeading}</span>
      <h1 className="text-[5vh] sm-580:text-[30px]">{H1}</h1>
      <p className="mt-2 text-base empty:hidden m-0 p-0">{subPara}</p>
    </div>
  );
};

export default H1tag;
